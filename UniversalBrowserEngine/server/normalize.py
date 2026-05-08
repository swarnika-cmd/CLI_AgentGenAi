from typing import Dict, Any, List

def normalize_to_component_tree(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Converts raw DOM, styles, and layout from the extension payload into a 
    universal UIComponentTree that abstracts away website-specific quirks.
    
    This function NEVER hallucinates data. It strictly cross-references the 
    accessibility tree with layout boxes and computed styles.
    """
    components = []
    
    a11y_tree = payload.get("accessibility_tree", [])
    computed_styles = payload.get("styles", {}).get("computed_per_element", {})
    element_boxes = payload.get("layout", {}).get("element_boxes", {})
    
    for node in a11y_tree:
        selector = node.get("selector")
        if not selector:
            continue
            
        box = element_boxes.get(selector, {})
        style = computed_styles.get(selector, {})
        
        # Only include elements that take up actual space on the screen
        if box.get("width", 0) > 0 and box.get("height", 0) > 0:
            components.append({
                "type": "UIComponent",
                "semantic_role": node.get("role"),
                "html_tag": node.get("tag"),
                "content": node.get("label"),
                "href": node.get("href"),
                "geometry": box,
                "visuals": {
                    "display": style.get("display"),
                    "background": style.get("background"),
                    "color": style.get("color"),
                    "font_family": style.get("fontFamily"),
                    "font_size": style.get("fontSize"),
                    "padding": style.get("padding"),
                    "margin": style.get("margin"),
                    "flex_direction": style.get("flexDirection"),
                    "border_radius": style.get("borderRadius")
                }
            })
            
    # Sort elements roughly by their visual position (top-to-bottom, left-to-right)
    components.sort(key=lambda c: (c["geometry"].get("y", 0), c["geometry"].get("x", 0)))
            
    return components
