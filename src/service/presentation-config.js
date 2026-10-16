// Temporary presentation features on this branch. Set VITE_PRESENTATION_MODE=false
// to use only the integrations already supplied by the backend.
export const presentationEnabled = import.meta.env?.VITE_PRESENTATION_MODE !== 'false'
