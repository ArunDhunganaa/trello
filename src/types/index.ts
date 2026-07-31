export type UserRole = 'owner' | 'admin' | 'member'

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface Board {
  id: string
  owner_id: string
  title: string
  description: string | null
  background: string
  is_starred: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface BoardMember {
  board_id: string
  user_id: string
  role: UserRole
  profile?: Profile
}

export interface List {
  id: string
  board_id: string
  title: string
  position: number
  is_archived: boolean
  created_at: string
}

export interface Card {
  id: string
  list_id: string
  board_id: string
  title: string
  description: string | null
  position: number
  due_date: string | null
  cover_color: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  board_id: string
  name: string | null
  color: string
}

export interface CardLabel {
  card_id: string
  label_id: string
}

export interface Checklist {
  id: string
  card_id: string
  title: string
  position: number
  items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  title: string
  is_completed: boolean
  position: number
}

export interface CardWithRelations extends Card {
  labels?: Label[]
  checklists?: Checklist[]
}

export interface BoardWithRelations extends Board {
  members?: BoardMember[]
  lists?: List[]
}
