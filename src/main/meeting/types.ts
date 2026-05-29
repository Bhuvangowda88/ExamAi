export type MeetingProvider = 'zoom' | 'teams' | 'meet'

export interface MeetingStatus {
  active: boolean
  provider?: MeetingProvider
  title?: string
  detectedAt: number
}
