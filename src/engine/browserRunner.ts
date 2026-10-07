import { chromium, Browser, Page } from 'playwright';
import { PageAuditResult, KeyboardStep, KeyboardTrailReport, ElementEvidence, RuleResult } from '../types/audit.js';
import { evaluateImages } from './rules/images.js';
import { evaluateKeyboard } from './rules/keyboard.js';
import { evaluateForms } from './rules/forms.js';
import { evaluateContrast } from './rules/contrast.js';
import { evaluateStructure } from './rules/structure.js';
import { evaluateLinksAndButtons } from './rules/links.js';
import { evaluateAria } from './rules/aria.js';
import { evaluateAnimations } from './rules/animations.js';
import { evaluateZoomAndReflow } from './rules/zoom.js';

let sharedBrowser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return sharedBrowser;
}

export async function runPageAudit(
  url: string,
  options: {
    simulateKeyboard?: boolean;
    simulateForms?: boolean;
    simulateZoom?: boolean;
    takeScreenshots?: boolean;
    timeout?: number;
  } = {}
): Promise<PageAuditResult> {
  const startTime = Date.now();
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Assistant-RGAA-Audit'
  });

  await context.addInitScript('window.__name = (fn, name) => fn; globalThis.__name = (fn, name) => fn;');

  const page = await context.newPage();
  const timeoutMs = options.timeout || 30000;

  try {
    // 1. Navigation sécurisée
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      // Inject __name polyfill in case of cross-navigation
      await page.evaluate('window.__name = (fn, name) => fn; globalThis.__name = (fn, name) => fn;').catch(() => {});
      // Wait a short moment for SPA hydration
      await page.waitForTimeout(1500);
    } catch (netErr: any) {
      // Distinction fondamentale : échec d'observation technique vs KO RGAA
      return {
        id: `audit-${Date.now()}`,
        url,
        title: 'Échec de connexion',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        viewport: { width: 1366, height: 768 },
        statusCounts: { OK: 0, KO: 0, A_VERIFIER: 0, NON_APPLICABLE: 0, total: 0 },
        rules: [],
        error: {
          type: 'NETWORK_ERROR',
          message: `Impossible de charger l'URL (${netErr.message}). Ceci est un incident réseau ou un blocage technique et ne constitue PAS une non-conformité RGAA.`,
          isAccessibilityKO: false
        }
      };
    }

    const pageTitle = await page.title();

    // 2. Extraction complète des données du DOM et des styles calculés
    const pageData = await page.evaluate(() => {
      function isVisible(el: HTMLElement) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getCssSelector(el: HTMLElement): string {
        if (el.id) return `#${CSS.escape(el.id)}`;
        let path = [];
        let current: HTMLElement | null = el;
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
          let tag = current.tagName.toLowerCase();
          let parent: HTMLElement | null = current.parentElement;
          if (parent) {
            let siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
            if (siblings.length > 1) {
              let idx = siblings.indexOf(current) + 1;
              tag += `:nth-of-type(${idx})`;
            }
          }
          path.unshift(tag);
          current = parent;
        }
        return path.join(' > ') || el.tagName.toLowerCase();
      }

      // --- IMAGES ---
      const images = Array.from(document.querySelectorAll('img, svg, [role="img"]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(el => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const hasAlt = htmlEl.hasAttribute('alt');
          const alt = htmlEl.getAttribute('alt');
          const role = htmlEl.getAttribute('role') || '';
          const ariaLabel = htmlEl.getAttribute('aria-label') || '';
          const ariaLabelledBy = htmlEl.getAttribute('aria-labelledby') || '';
          const src = htmlEl.getAttribute('src') || '';
          const isInsideLink = !!htmlEl.closest('a');
          const isInsideButton = !!htmlEl.closest('button');
          const figure = htmlEl.closest('figure');
          const hasFigcaption = figure ? !!figure.querySelector('figcaption') : false;

          return {
            selector: getCssSelector(htmlEl),
            tagName: htmlEl.tagName.toLowerCase(),
            htmlSnippet: htmlEl.outerHTML.slice(0, 200),
            hasAlt,
            alt: alt !== null ? alt : undefined,
            role,
            ariaLabel,
            ariaLabelledBy,
            src,
            isInsideLink,
            isInsideButton,
            hasFigcaption,
            hasLongdesc: htmlEl.hasAttribute('longdesc'),
            hasAriaDescribedBy: htmlEl.hasAttribute('aria-describedby'),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
          };
        });

      // --- FORMULAIRES ---
      const formEls = Array.from(document.querySelectorAll('form'));
      const rawFields = Array.from(document.querySelectorAll('input, select, textarea'))
        .filter(el => {
          const type = (el.getAttribute('type') || '').toLowerCase();
          return !['hidden', 'submit', 'button', 'reset', 'image'].includes(type);
        })
        .filter(el => isVisible(el as HTMLElement));

      const formFields = rawFields.map(f => {
        const htmlF = f as HTMLInputElement;
        const id = htmlF.id;
        const type = htmlF.type || 'text';
        const name = htmlF.name || '';
        const rect = htmlF.getBoundingClientRect();
        const placeholder = htmlF.getAttribute('placeholder') || '';
        const title = htmlF.getAttribute('title') || '';
        const ariaLabel = htmlF.getAttribute('aria-label') || '';
        const ariaLabelledby = htmlF.getAttribute('aria-labelledby') || '';
        
        let labelText = '';
        let hasForLabel = false;
        if (id) {
          const l = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (l) {
            labelText = (l as HTMLElement).innerText.trim();
            hasForLabel = true;
          }
        }
        const parentLabel = htmlF.closest('label');
        let hasParentLabel = false;
        if (!labelText && parentLabel) {
          labelText = parentLabel.innerText.trim();
          hasParentLabel = true;
        }

        const accessibleName = ariaLabel || labelText || title || '';
        const onlyPlaceholder = !accessibleName && !!placeholder;

        return {
          selector: getCssSelector(htmlF),
          tagName: htmlF.tagName.toLowerCase(),
          htmlSnippet: htmlF.outerHTML.slice(0, 150),
          id,
          type,
          name,
          placeholder,
          hasForLabel,
          hasParentLabel,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledBy: !!ariaLabelledby,
          hasPlaceholder: !!placeholder,
          hasAccessibleName: !!accessibleName || onlyPlaceholder,
          onlyPlaceholder,
          accessibleName: accessibleName || (onlyPlaceholder ? placeholder : ''),
          autocomplete: htmlF.getAttribute('autocomplete'),
          required: htmlF.required || htmlF.getAttribute('aria-required') === 'true',
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
        };
      });

      // Fieldset / Legend groups
      const radiosAndCheckboxes = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]')) as HTMLInputElement[];
      const groupsByName: Record<string, HTMLInputElement[]> = {};
      radiosAndCheckboxes.forEach(input => {
        if (input.name) {
          groupsByName[input.name] = groupsByName[input.name] || [];
          groupsByName[input.name].push(input);
        }
      });

      const radioOrCheckboxGroups = Object.entries(groupsByName)
        .filter(([_, inputs]) => inputs.length > 1)
        .map(([name, inputs]) => {
          const first = inputs[0];
          const fieldset = first.closest('fieldset');
          const hasFieldset = !!fieldset && !!fieldset.querySelector('legend');
          const groupContainer = first.closest('[role="group"]');
          const hasRoleGroup = !!groupContainer;
          return {
            name,
            count: inputs.length,
            hasFieldset,
            hasRoleGroup,
            sampleSelector: getCssSelector(first),
            sampleSnippet: first.outerHTML.slice(0, 150)
          };
        });

      // --- TITRES ET STRUCTURATION ---
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(h => {
          const htmlH = h as HTMLElement;
          let level = 1;
          if (htmlH.tagName.startsWith('H')) {
            level = parseInt(htmlH.tagName.substring(1), 10) || 1;
          } else if (htmlH.getAttribute('aria-level')) {
            level = parseInt(htmlH.getAttribute('aria-level') || '1', 10) || 1;
          }
          return {
            selector: getCssSelector(htmlH),
            tagName: htmlH.tagName.toLowerCase(),
            htmlSnippet: htmlH.outerHTML.slice(0, 150),
            level,
            text: htmlH.innerText.trim().slice(0, 60)
          };
        });

      // Landmarks
      const landmarks = Array.from(document.querySelectorAll('main, header, nav, footer, aside, [role="main"], [role="banner"], [role="navigation"], [role="contentinfo"], [role="complementary"]'))
        .map(l => {
          const htmlL = l as HTMLElement;
          return {
            selector: getCssSelector(htmlL),
            tagName: htmlL.tagName.toLowerCase(),
            role: htmlL.getAttribute('role') || htmlL.tagName.toLowerCase()
          };
        });

      // --- LIENS ET BOUTONS ---
      const links = Array.from(document.querySelectorAll('a[href]'))
        .filter(el => isVisible(el as HTMLElement))
        .slice(0, 100)
        .map(a => {
          const htmlA = a as HTMLAnchorElement;
          const rect = htmlA.getBoundingClientRect();
          const text = htmlA.innerText.trim();
          const ariaLabel = htmlA.getAttribute('aria-label') || '';
          const title = htmlA.getAttribute('title') || '';
          const img = htmlA.querySelector('img');
          const imgAlt = img ? img.getAttribute('alt') || '' : '';
          const accessibleName = ariaLabel || text || imgAlt || title;

          return {
            selector: getCssSelector(htmlA),
            href: htmlA.getAttribute('href') || '',
            htmlSnippet: htmlA.outerHTML.slice(0, 150),
            accessibleName,
            ariaLabel,
            title,
            hasImgChild: !!img,
            isTargetBlank: htmlA.target === '_blank',
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
          };
        });

      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(el => isVisible(el as HTMLElement))
        .slice(0, 100)
        .map(b => {
          const htmlB = b as HTMLElement;
          const rect = htmlB.getBoundingClientRect();
          const text = htmlB.innerText.trim();
          const ariaLabel = htmlB.getAttribute('aria-label') || '';
          const title = htmlB.getAttribute('title') || '';
          const img = htmlB.querySelector('img');
          const imgAlt = img ? img.getAttribute('alt') || '' : '';
          const accessibleName = ariaLabel || text || imgAlt || title;

          return {
            selector: getCssSelector(htmlB),
            tagName: htmlB.tagName.toLowerCase(),
            htmlSnippet: htmlB.outerHTML.slice(0, 150),
            role: htmlB.getAttribute('role') || 'button',
            type: htmlB.getAttribute('type') || 'button',
            accessibleName,
            hasIcon: !!htmlB.querySelector('svg, img, [class*="icon"]'),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
          };
        });

      // --- CONTRASTES DE COULEURS ---
      function srgbToLin(c: number) {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function luminance(r: number, g: number, b: number) {
        return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
      }
      function parseRgb(colorStr: string): [number, number, number] | null {
        const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
      }
      function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]) {
        const l1 = luminance(...rgb1);
        const l2 = luminance(...rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }
      function getEffectiveBackground(el: HTMLElement): { color: string; hasImage: boolean; hasGradient: boolean } {
        let current: HTMLElement | null = el;
        let hasImage = false;
        let hasGradient = false;

        while (current && current !== document.documentElement) {
          const style = window.getComputedStyle(current);
          const bgImg = style.backgroundImage || '';
          if (bgImg && bgImg !== 'none') {
            if (bgImg.includes('gradient')) hasGradient = true;
            else hasImage = true;
          }
          const bg = style.backgroundColor;
          if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
            return { color: bg, hasImage, hasGradient };
          }
          current = current.parentElement;
        }
        return { color: 'rgb(255, 255, 255)', hasImage, hasGradient };
      }

      const textContrastItems: any[] = [];
      const textCandidateElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, button, a, span, label'))
        .filter(el => isVisible(el as HTMLElement))
        .slice(0, 300);

      for (const el of textCandidateElements) {
        const htmlEl = el as HTMLElement;
        const text = htmlEl.innerText.trim();
        if (text.length < 2 || htmlEl.children.length > 3) continue;

        const style = window.getComputedStyle(htmlEl);
        const fgRgb = parseRgb(style.color);
        const bgInfo = getEffectiveBackground(htmlEl);
        const bgRgb = parseRgb(bgInfo.color);

        if (!fgRgb || !bgRgb) continue;

        const ratio = contrastRatio(fgRgb, bgRgb);
        const fontSize = parseFloat(style.fontSize) || 16;
        const fontWeight = parseInt(style.fontWeight, 10) || 400;
        const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && fontWeight >= 700);
        const requiredRatio = isLargeText ? 3.0 : 4.5;
        const rect = htmlEl.getBoundingClientRect();

        textContrastItems.push({
          selector: getCssSelector(htmlEl),
          tagName: htmlEl.tagName.toLowerCase(),
          htmlSnippet: htmlEl.outerHTML.slice(0, 150),
          text: text.slice(0, 60),
          color: style.color,
          bgColor: bgInfo.color,
          hasBackgroundImage: bgInfo.hasImage,
          hasGradient: bgInfo.hasGradient,
          ratio,
          requiredRatio,
          fontSize,
          fontWeight,
          isLargeText,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
        });
      }

      // Liens dans le texte
      const inlineLinks = Array.from(document.querySelectorAll('p a, li a'))
        .filter(el => isVisible(el as HTMLElement))
        .slice(0, 50)
        .map(a => {
          const htmlA = a as HTMLElement;
          const style = window.getComputedStyle(htmlA);
          const td = style.textDecorationLine || style.textDecoration || '';
          const bbw = parseFloat(style.borderBottomWidth) || 0;
          return {
            selector: getCssSelector(htmlA),
            htmlSnippet: htmlA.outerHTML.slice(0, 120),
            text: htmlA.innerText.trim(),
            parentText: htmlA.parentElement ? htmlA.parentElement.innerText.trim().slice(0, 60) : '',
            isUnderlined: td.includes('underline'),
            hasBorderBottom: bbw > 0,
            color: style.color
          };
        });

      // Statuts uniquement par la couleur
      const colorOnlyItems = Array.from(document.querySelectorAll('[class*="error"], [class*="success"], [class*="warning"], [class*="danger"], [class*="alert"], [class*="badge"], [class*="tag"]'))
        .filter(el => isVisible(el as HTMLElement))
        .slice(0, 30)
        .map(el => {
          const htmlEl = el as HTMLElement;
          const hasIcon = !!htmlEl.querySelector('svg, img, [class*="icon"], [class*="fa-"]');
          return {
            selector: getCssSelector(htmlEl),
            tagName: htmlEl.tagName.toLowerCase(),
            htmlSnippet: htmlEl.outerHTML.slice(0, 120),
            className: htmlEl.className,
            text: htmlEl.innerText.trim().slice(0, 40),
            hasIcon
          };
        });

      // --- ANIMATIONS & MEDIA ---
      const carousels = Array.from(document.querySelectorAll('[class*="carousel"], [class*="slider"], [class*="swiper"], [class*="splide"], [class*="owl"], [class*="slick"], [data-ride]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(c => ({
          selector: getCssSelector(c as HTMLElement),
          tagName: c.tagName.toLowerCase(),
          htmlSnippet: c.outerHTML.slice(0, 150),
          type: 'carousel'
        }));

      const autoplayVideos = Array.from(document.querySelectorAll('video[autoplay]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(v => ({
          selector: getCssSelector(v as HTMLElement),
          tagName: 'video',
          htmlSnippet: v.outerHTML.slice(0, 150),
          type: 'video-autoplay'
        }));

      const pauseButtons = Array.from(document.querySelectorAll('button[aria-label*="pause" i], button[aria-label*="stop" i], button[aria-label*="arrêt" i], [class*="pause"], [class*="stop"]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(p => {
          const htmlP = p as HTMLElement;
          return {
            selector: getCssSelector(htmlP),
            tagName: htmlP.tagName.toLowerCase(),
            htmlSnippet: htmlP.outerHTML.slice(0, 150),
            accessibleName: htmlP.getAttribute('aria-label') || htmlP.innerText.trim()
          };
        });

      const hasReducedMotionCSS = (() => {
        try {
          return Array.from(document.styleSheets).some(sheet => {
            try {
              return Array.from(sheet.cssRules || []).some(rule =>
                (rule as CSSMediaRule).media?.mediaText?.includes('prefers-reduced-motion')
              );
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      })();

      // --- ARIA VALIDATION ---
      const allAriaElements = Array.from(document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-hidden], [aria-expanded]'));
      const brokenAriaReferences: any[] = [];
      const ariaHiddenOnFocusables: any[] = [];
      const invalidAriaRoles: any[] = [];

      const validRoles = new Set([
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox', 'columnheader',
        'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 'directory', 'document', 'feed',
        'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem',
        'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
        'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region',
        'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
        'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
      ]);

      allAriaElements.slice(0, 150).forEach(el => {
        const htmlEl = el as HTMLElement;
        const role = htmlEl.getAttribute('role');
        if (role && !validRoles.has(role.toLowerCase())) {
          invalidAriaRoles.push({
            selector: getCssSelector(htmlEl),
            tagName: htmlEl.tagName.toLowerCase(),
            htmlSnippet: htmlEl.outerHTML.slice(0, 120),
            role
          });
        }

        ['aria-labelledby', 'aria-describedby'].forEach(attr => {
          const val = htmlEl.getAttribute(attr);
          if (val) {
            val.split(/\s+/).forEach(refId => {
              if (refId && !document.getElementById(refId)) {
                brokenAriaReferences.push({
                  selector: getCssSelector(htmlEl),
                  tagName: htmlEl.tagName.toLowerCase(),
                  htmlSnippet: htmlEl.outerHTML.slice(0, 120),
                  attribute: attr,
                  missingId: refId
                });
              }
            });
          }
        });

        const ariaHidden = htmlEl.getAttribute('aria-hidden');
        if (ariaHidden === 'true') {
          const isFocusable = htmlEl.matches('a[href], button, input, select, textarea, [tabindex="0"]');
          const hasFocusableChild = !!htmlEl.querySelector('a[href], button, input, select, textarea, [tabindex="0"]');
          if (isFocusable || hasFocusableChild) {
            ariaHiddenOnFocusables.push({
              selector: getCssSelector(htmlEl),
              tagName: htmlEl.tagName.toLowerCase(),
              htmlSnippet: htmlEl.outerHTML.slice(0, 120)
            });
          }
        }
      });

      // --- ZOOM & CLIPPING HEURISTICS ---
      const fixedHeightClippedContainers: any[] = [];
      const textContainers = Array.from(document.querySelectorAll('div, section, article, p, main, aside')).slice(0, 200);
      for (const el of textContainers) {
        const htmlEl = el as HTMLElement;
        if (!isVisible(htmlEl)) continue;
        const style = window.getComputedStyle(htmlEl);
        const overflow = style.overflow;
        const overflowY = style.overflowY;
        const h = style.height;

        if (
          (overflow === 'hidden' || overflowY === 'hidden') &&
          h.endsWith('px') &&
          parseFloat(h) > 30 &&
          htmlEl.scrollHeight > htmlEl.clientHeight + 8
        ) {
          fixedHeightClippedContainers.push({
            selector: getCssSelector(htmlEl),
            tagName: htmlEl.tagName.toLowerCase(),
            htmlSnippet: htmlEl.outerHTML.slice(0, 120),
            height: h,
            overflow: overflowY !== 'visible' ? overflowY : overflow,
            scrollHeight: htmlEl.scrollHeight,
            clientHeight: htmlEl.clientHeight
          });
        }
      }

      // --- INTERACTIVE & TABINDEX CHECKS ---
      const interactiveElements = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, [tabindex], [role="button"]'))
        .filter(el => isVisible(el as HTMLElement));

      const tabIndexMinus1OnNatives = Array.from(document.querySelectorAll('a[tabindex="-1"], button[tabindex="-1"], input[tabindex="-1"], select[tabindex="-1"], textarea[tabindex="-1"]'))
        .filter(el => isVisible(el as HTMLElement))
        .map(el => {
          const htmlEl = el as HTMLElement;
          return {
            selector: getCssSelector(htmlEl),
            tagName: htmlEl.tagName.toLowerCase(),
            htmlSnippet: htmlEl.outerHTML.slice(0, 120),
            role: htmlEl.getAttribute('role') || ''
          };
        });

      return {
        title: document.title,
        htmlLang: document.documentElement.getAttribute('lang') || '',
        images,
        forms: formEls.map(f => ({ id: f.id, action: f.action })),
        formFields,
        radioOrCheckboxGroups,
        headings,
        landmarks,
        links,
        buttons,
        textContrastItems,
        inlineLinks,
        colorOnlyItems,
        carousels,
        autoplayVideos,
        pauseButtons,
        hasReducedMotionCSS,
        ariaElements: allAriaElements.map(el => getCssSelector(el as HTMLElement)),
        brokenAriaReferences,
        ariaHiddenOnFocusables,
        invalidAriaRoles,
        fixedHeightClippedContainers,
        interactiveElements: interactiveElements.map(el => getCssSelector(el as HTMLElement)),
        tabIndexMinus1OnNatives,
        nonFocusableClickables: []
      };
    });

    // 3. Simulation Clavier Avancée avec Playwright
    let keyboardTrail: KeyboardTrailReport | undefined;
    if (options.simulateKeyboard !== false) {
      keyboardTrail = await simulateKeyboardNavigation(page);
    }

    // 4. Test Comportemental des Formulaires (Non-Destructif)
    let formSimulationResult: any = null;
    if (options.simulateForms !== false && pageData.forms.length > 0) {
      formSimulationResult = await simulateFormSubmission(page);
    }

    // 5. Test Zoom & Reflow 320px
    let zoomSimulationData: any = null;
    if (options.simulateZoom !== false) {
      zoomSimulationData = await simulateZoomReflow(page);
    }

    // 6. Capture d'écran générale
    let fullScreenshotBase64 = '';
    if (options.takeScreenshots !== false) {
      try {
        const buffer = await page.screenshot({ type: 'jpeg', quality: 50, fullPage: false });
        fullScreenshotBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch (err) {
        // ignore screenshot error
      }
    }

    // 7. Évaluation de toutes les règles RGAA
    const rules: RuleResult[] = [
      ...evaluateImages(pageData),
      ...evaluateKeyboard(pageData, keyboardTrail),
      ...evaluateForms(pageData, formSimulationResult),
      ...evaluateContrast(pageData),
      ...evaluateStructure(pageData),
      ...evaluateLinksAndButtons(pageData),
      ...evaluateAria(pageData),
      ...evaluateAnimations(pageData),
      ...evaluateZoomAndReflow(pageData, zoomSimulationData)
    ];

    // Calcul des statistiques
    const statusCounts = {
      OK: rules.filter(r => r.status === 'OK').length,
      KO: rules.filter(r => r.status === 'KO').length,
      A_VERIFIER: rules.filter(r => r.status === 'A_VERIFIER').length,
      NON_APPLICABLE: rules.filter(r => r.status === 'NON_APPLICABLE').length,
      total: rules.length
    };

    return {
      id: `audit-${Date.now()}`,
      url,
      title: pageTitle || url,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      viewport: { width: 1366, height: 768 },
      statusCounts,
      rules,
      keyboardTrail,
      fullScreenshotBase64
    };
  } finally {
    await page.close();
    await context.close();
  }
}

async function simulateKeyboardNavigation(page: Page): Promise<KeyboardTrailReport> {
  const steps: KeyboardStep[] = [];
  const seenUids = new Set<string>();
  let trapDetected = false;
  let lostFocusCount = 0;
  let invisibleFocusCount = 0;

  try {
    await page.click('body', { timeout: 1500 });
  } catch {}

  const maxSteps = 35;
  for (let step = 1; step <= maxSteps; step++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);

    const stepData = await page.evaluate((currStep) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el === document.documentElement) {
        return { isBody: true, currStep };
      }

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const outlineWidth = parseFloat(style.outlineWidth) || 0;
      const outlineStyle = style.outlineStyle || 'none';
      const outlineColor = style.outlineColor || '';
      const boxShadow = style.boxShadow || '';
      const borderColor = style.borderColor || '';

      const hasFocusIndicator =
        (outlineWidth > 0 && outlineStyle !== 'none') ||
        (boxShadow !== 'none' && boxShadow !== '' && !boxShadow.includes('rgba(0, 0, 0, 0)'));

      const isOffScreen = rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > window.innerHeight;

      const uid = `${el.tagName}|${el.id}|${el.className}|${(el.innerText || '').slice(0, 20)}`;

      return {
        isBody: false,
        uid,
        currStep,
        tagName: el.tagName.toLowerCase(),
        selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        accessibleName: el.getAttribute('aria-label') || el.innerText.trim().slice(0, 40) || el.getAttribute('title') || '',
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        hasFocusIndicator,
        isOffScreen,
        computedFocusStyles: {
          outlineWidth: style.outlineWidth,
          outlineStyle,
          outlineColor,
          boxShadow,
          borderColor
        },
        htmlSnippet: el.outerHTML.slice(0, 140)
      };
    }, step);

    if (stepData.isBody) {
      lostFocusCount++;
      continue;
    }

    if (seenUids.has(stepData.uid!)) {
      // If we see the same element repeatedly, it could be a focus trap
      const isRepeatOfLast = steps.length > 0 && steps[steps.length - 1].htmlSnippet === stepData.htmlSnippet;
      if (isRepeatOfLast) {
        trapDetected = true;
        steps.push({
          stepIndex: step,
          tagName: stepData.tagName!,
          selector: stepData.selector!,
          role: stepData.role!,
          accessibleName: stepData.accessibleName!,
          rect: stepData.rect,
          hasFocusIndicator: stepData.hasFocusIndicator!,
          computedFocusStyles: stepData.computedFocusStyles!,
          htmlSnippet: stepData.htmlSnippet!,
          isTrap: true
        });
        break;
      }
    }

    seenUids.add(stepData.uid!);

    if (!stepData.hasFocusIndicator) {
      invisibleFocusCount++;
    }

    steps.push({
      stepIndex: step,
      tagName: stepData.tagName!,
      selector: stepData.selector!,
      role: stepData.role!,
      accessibleName: stepData.accessibleName!,
      rect: stepData.rect,
      hasFocusIndicator: stepData.hasFocusIndicator!,
      computedFocusStyles: stepData.computedFocusStyles!,
      htmlSnippet: stepData.htmlSnippet!,
      isOffScreen: stepData.isOffScreen
    });
  }

  return {
    totalSteps: steps.length,
    uniqueElementsReached: seenUids.size,
    invisibleFocusCount,
    trapDetected,
    lostFocusCount,
    steps,
    status: trapDetected ? 'KO' : invisibleFocusCount > 0 ? 'KO' : 'OK',
    summary: `${steps.length} étapes testées au clavier : ${invisibleFocusCount} sans indicateur de focus visible, ${trapDetected ? 'PIÈGE CLAVIER DÉTECTÉ' : 'aucun piège bloquant'}.`
  };
}

async function simulateFormSubmission(page: Page): Promise<any> {
  try {
    const hasForm = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return false;
      // Empty text fields to provoke validation
      const inputs = f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
      inputs.forEach(i => { (i as HTMLInputElement).value = ''; });
      return true;
    });

    if (!hasForm) return { triggered: false };

    // Try clicking submit safely
    const submitBtn = await page.$('form [type="submit"], form button[type="submit"], form button:not([type="button"])');
    if (!submitBtn) return { triggered: false };

    await Promise.race([
      submitBtn.click(),
      new Promise(res => setTimeout(res, 2500))
    ]);

    await page.waitForTimeout(1000);

    const errorEvaluation = await page.evaluate(() => {
      const errorSelectors = [
        '[role="alert"]',
        '[aria-invalid="true"]',
        '[aria-live="polite"]',
        '[aria-live="assertive"]',
        '.error', '.field-error', '.form-error', '.invalid-feedback'
      ];
      const errorElements = Array.from(document.querySelectorAll(errorSelectors.join(',')))
        .filter(el => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && (el.textContent || '').trim().length > 0;
        });

      return {
        hasErrors: errorElements.length > 0,
        errorCount: errorElements.length,
        evidence: errorElements.slice(0, 5).map(e => ({
          selector: e.tagName.toLowerCase(),
          tagName: e.tagName.toLowerCase(),
          htmlSnippet: e.outerHTML.slice(0, 150),
          signals: { role: e.getAttribute('role'), ariaLive: e.getAttribute('aria-live') },
          issueDescription: `Message d'erreur affiché après validation : "${(e.textContent || '').trim().slice(0, 80)}"`
        }))
      };
    });

    return {
      triggered: true,
      hasAccessibleError: errorEvaluation.hasErrors,
      errorCount: errorEvaluation.errorCount,
      evidence: errorEvaluation.evidence
    };
  } catch {
    return { triggered: false };
  }
}

async function simulateZoomReflow(page: Page): Promise<any> {
  try {
    // Test viewport in mobile / 320 CSS width
    await page.setViewportSize({ width: 320, height: 640 });
    await page.waitForTimeout(500);

    const reflowData = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const windowWidth = window.innerWidth;
      const hasHorizontalScroll = docWidth > windowWidth + 5;

      return {
        scrollWidthAt320: docWidth,
        hasHorizontalScrollAt320: hasHorizontalScroll,
        reflowIssues: hasHorizontalScroll ? [{
          selector: 'html',
          tagName: 'html',
          htmlSnippet: '<html>...</html>',
          signals: { scrollWidth: docWidth, viewportWidth: 320 },
          issueDescription: `En largeur de 320px, la page génère un défilement horizontal de ${docWidth}px (dépassement de ${docWidth - 320}px).`
        }] : []
      };
    });

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    return reflowData;
  } catch {
    return null;
  }
}
