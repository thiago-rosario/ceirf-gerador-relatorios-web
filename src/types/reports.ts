export type Municipality = { id: number; name: string; state_code: string }

export type Report = {
  id: string
  status: string
  coordination_id?: number | null
  created_by?: string
  created_at: string
  revision_number?: number
  revision_label?: string | null
  cover: { municipality: Municipality | null; typology: string } | null
  general_information: { inspection_date: string | null } | null
  generated_document: { file_name: string; generated_at: string } | null
}

export type ReportPagination = {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number | null
  to: number | null
}

export type ReportSearch = { municipalityId: number | null; typology: string; page: number; coordinationId: number | null }
export type ReportsResult = { reports: Report[]; pagination: ReportPagination }
export type ReportPdf = { blob: Blob; fileName: string }
