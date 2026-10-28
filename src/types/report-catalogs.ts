export type ReportCatalogOption = { key: string; label: string }
export type ReportFormOptions = {
  forces: ReportCatalogOption[]
  typologies: ReportCatalogOption[]
  answers: ReportCatalogOption[]
  infrastructure: ReportCatalogOption[]
  checklist: ReportCatalogOption[]
}
export type ReportCatalogName = keyof ReportFormOptions
