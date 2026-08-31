const MATHJAX_SCRIPT_ID = 'xyquiver-mathjax-svg';
const MATHJAX_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg-full.js';
const XYJAX_ROOT = 'https://cdn.jsdelivr.net/gh/sonoisa/XyJax-v3@3.0.1/build';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

interface MathJaxRuntime {
  startup?: { promise?: Promise<unknown> };
  tex2svgPromise: (
    source: string,
    options?: { display?: boolean },
  ) => Promise<Element>;
}

type MathJaxWindow = Window & {
  MathJax?: MathJaxRuntime | Record<string, unknown>;
};

let runtimePromise: Promise<MathJaxRuntime> | null = null;

function currentRuntime(): MathJaxRuntime | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as MathJaxWindow).MathJax;
  return candidate && typeof candidate.tex2svgPromise === 'function'
    ? (candidate as MathJaxRuntime)
    : null;
}

async function ensureXyJax(): Promise<MathJaxRuntime> {
  const ready = currentRuntime();
  if (ready) {
    await ready.startup?.promise;
    return ready;
  }
  if (runtimePromise) return runtimePromise;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('XyJax SVG rendering is only available in a browser.');
  }

  runtimePromise = new Promise<MathJaxRuntime>((resolve, reject) => {
    const browserWindow = window as MathJaxWindow;
    browserWindow.MathJax = {
      loader: {
        load: ['[xypic]/xypic.js'],
        paths: { xypic: XYJAX_ROOT },
      },
      tex: { packages: { '[+]': ['xypic'] } },
      svg: { fontCache: 'local' },
      startup: { typeset: false },
    };

    const finish = async () => {
      try {
        const candidate = browserWindow.MathJax as
          | { startup?: { promise?: Promise<unknown> } }
          | undefined;
        await candidate?.startup?.promise;
        const runtime = currentRuntime();
        if (!runtime) throw new Error('MathJax SVG runtime did not start.');
        resolve(runtime);
      } catch (error) {
        runtimePromise = null;
        document.getElementById(MATHJAX_SCRIPT_ID)?.remove();
        reject(error);
      }
    };
    const fail = () => {
      runtimePromise = null;
      document.getElementById(MATHJAX_SCRIPT_ID)?.remove();
      reject(new Error('Could not load the XyJax SVG renderer.'));
    };

    const existing = document.getElementById(
      MATHJAX_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = MATHJAX_SCRIPT_ID;
    script.src = MATHJAX_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  });

  return runtimePromise;
}

function sanitizeSvg(svg: SVGSVGElement) {
  svg
    .querySelectorAll('script, foreignObject')
    .forEach((node) => node.remove());
  const sanitizeElement = (element: Element) => {
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on')) element.removeAttribute(attribute.name);
      if (
        (name === 'href' || name === 'xlink:href') &&
        !attribute.value.startsWith('#')
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  };
  sanitizeElement(svg);
  svg.querySelectorAll('*').forEach(sanitizeElement);
}

function addBackground(svg: SVGSVGElement) {
  const values = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/)
    .map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return;
  }
  const [x, y, width, height] = values;
  const rect = document.createElementNS(SVG_NAMESPACE, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('fill', '#ffffff');
  svg.insertBefore(rect, svg.firstChild);
}

function fitViewBoxToRenderedContent(svg: SVGSVGElement, padding = 360) {
  const current = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/)
    .map(Number);
  if (
    current.length !== 4 ||
    current.some((value) => !Number.isFinite(value))
  ) {
    return;
  }

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
  host.appendChild(svg);
  document.body.appendChild(host);
  try {
    const graphics =
      svg.querySelector<SVGGraphicsElement>('g[data-mml-node="math"]') ??
      svg.querySelector<SVGGraphicsElement>('g');
    const bounds = graphics?.getBBox();
    if (
      !bounds ||
      ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
    ) {
      return;
    }
    const [x, y, width, height] = current;
    const left = Math.min(x, bounds.x - padding);
    const top = Math.min(y, bounds.y - padding);
    const right = Math.max(x + width, bounds.x + bounds.width + padding);
    const bottom = Math.max(y + height, bounds.y + bounds.height + padding);
    svg.setAttribute(
      'viewBox',
      `${left} ${top} ${right - left} ${bottom - top}`,
    );
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  } catch {
    // Keep MathJax's original viewBox if this browser cannot measure SVG text.
  } finally {
    host.remove();
  }
}

export async function renderXyPicSvg(
  source: string,
  options: { background?: boolean; title?: string } = {},
): Promise<string> {
  const runtime = await ensureXyJax();
  const container = await runtime.tex2svgPromise(source, { display: true });
  const rendered = container.querySelector('svg');
  if (!(rendered instanceof SVGSVGElement)) {
    throw new Error('XyJax did not return an SVG diagram.');
  }

  const svg = rendered.cloneNode(true) as SVGSVGElement;
  sanitizeSvg(svg);
  svg.setAttribute('xmlns', SVG_NAMESPACE);
  svg.setAttribute('role', 'img');
  svg.setAttribute('color', '#111827');
  fitViewBoxToRenderedContent(svg);
  if (options.background) addBackground(svg);
  if (options.title) {
    const title = document.createElementNS(SVG_NAMESPACE, 'title');
    title.textContent = options.title;
    svg.insertBefore(title, svg.firstChild);
  }

  return new XMLSerializer().serializeToString(svg);
}
