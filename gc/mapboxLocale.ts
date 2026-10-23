import { m } from "$parent/src/lib/paraglide/messages";

/** Mapbox's own control labels (zoom, attribution, logo) in the device language. */
export function mapboxLocale(): Record<string, string> {
    return {
        "AttributionControl.ToggleAttribution": m.gc_mapbox_attribution_toggle(),
        "FullscreenControl.Enter": m.gc_mapbox_fullscreen_enter(),
        "FullscreenControl.Exit": m.gc_mapbox_fullscreen_exit(),
        "GeolocateControl.FindMyLocation": m.gc_mapbox_find_my_location(),
        "GeolocateControl.LocationNotAvailable": m.gc_mapbox_location_not_available(),
        "LogoControl.Title": m.gc_mapbox_logo_title(),
        "Map.Title": m.gc_mapbox_map_title(),
        "NavigationControl.ResetBearing": m.gc_mapbox_reset_bearing(),
        "NavigationControl.ZoomIn": m.gc_mapbox_zoom_in(),
        "NavigationControl.ZoomOut": m.gc_mapbox_zoom_out(),
        "ScrollZoomBlocker.CmdMessage": m.gc_mapbox_scroll_zoom_cmd(),
        "ScrollZoomBlocker.CtrlMessage": m.gc_mapbox_scroll_zoom_ctrl(),
        "TouchPanBlocker.Message": m.gc_mapbox_touch_pan(),
        "Marker.Title": m.gc_mapbox_marker_title(),
        "Popup.Close": m.gc_mapbox_popup_close(),
    };
}
