chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GATHER_DOM") {
    const payload = generatePayload(request.screenshot);
    sendResponse({ payload });
  }
  return true;
});

function generatePayload(screenshotBase64) {
  const elements = document.querySelectorAll('body *');
  const computed_per_element = {};
  const element_boxes = {};
  const accessibility_tree = [];
  const css_variables = {};
  
  // Extract CSS Variables from root
  const rootStyles = getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyles.length; i++) {
    const prop = rootStyles[i];
    if (prop.startsWith('--')) {
      css_variables[prop] = rootStyles.getPropertyValue(prop).trim();
    }
  }

  let idCounter = 0;

  elements.forEach((el) => {
    // Inject unique identifier to map layout/styles without brittle selectors
    if (!el.id && !el.dataset.ubId) {
      el.dataset.ubId = 'ub_node_' + (idCounter++);
    }
    const selector = el.id ? `#${el.id}` : `[data-ub-id="${el.dataset.ubId}"]`;
    
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Skip invisible or zero-dimension nodes
    if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
      return;
    }

    computed_per_element[selector] = {
      display: style.display,
      background: style.backgroundColor,
      color: style.color,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      padding: style.padding,
      margin: style.margin,
      position: style.position,
      flexDirection: style.flexDirection,
      borderRadius: style.borderRadius
    };

    element_boxes[selector] = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };

    // Build accessibility/semantic node
    accessibility_tree.push({
      selector: selector,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label') || el.innerText?.slice(0, 100).replace(/\n/g, ' ') || null,
      href: el.getAttribute('href') || null
    });
  });

  return {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    },
    screenshot_base64: screenshotBase64,
    dom: {
      html: document.documentElement.outerHTML.slice(0, 500000), // Safety truncation
      shadow_roots: [], 
      iframes: []
    },
    styles: {
      css_variables: css_variables,
      stylesheets: [], 
      computed_per_element: computed_per_element
    },
    layout: {
      element_boxes: element_boxes
    },
    accessibility_tree: accessibility_tree,
    fonts: [],
    framework_hints: {
      react: !!document.querySelector('[data-reactroot], [data-reactid], #__next, #root')
    },
    network: { api_calls: [], assets: [] }
  };
}
