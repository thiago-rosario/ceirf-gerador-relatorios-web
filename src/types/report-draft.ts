export type Answer = 'SIM' | 'NÃO' | 'NÃO SE APLICA' | null
export type AssetKind = 'location_map' | 'state_map' | 'pre_implementation' | 'photograph' | 'municipality_map' | 'topographic_plan' | 'other'
export type FileReference = { storage_identifier: string; file_name: string; mime_type: string; size_bytes: number; checksum: string }
export type ReportAsset = {
  id: string
  kind: AssetKind
  name: string
  mimeType: string
  size: number
  checksum: string
  order: number
  caption: string
  description: string
  file?: File
  reference?: FileReference
}
export type ReportDraft = {
  cover: { municipality_id: number | null; force: string; size: string; typology: string; sei_number: string }
  general_information: { inspection_date: string; collaborators: string }
  infrastructure: Record<string, Answer>
  checklist: Record<string, Answer>
  conclusion: string
  assets: ReportAsset[]
  // The history prevents removing and adding a photograph again to change its position.
  photoHistory: Record<string, number>
  nextPhotoOrder: number
}
export type StepIssue = { field: string; message: string }
