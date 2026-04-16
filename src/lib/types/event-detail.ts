// src/lib/types/event-detail.ts
// Type for the return value of eventService.getEventDetail()

export interface EventDetailSection {
  id: number;
  name: string;
  type: 'assigned' | 'general';
  price: number;
  capacity: number;
  layout_config: unknown;
  seat_config: unknown;
  sales_start_at: string | null;
  sales_end_at: string | null;
  seat_count: number;
  available_count: number;
  disabled_count: number;
}

export interface EventDetailItineraryItem {
  time?: string;
  activity?: string;
  description?: string;
  // Legacy/alternative keys from show editor
  time_start?: string;
  time_end?: string;
  title?: string;
}

export interface EventDetailShow {
  id: number;
  title: string | null;
  show_date: string;
  start_time: string;
  end_time: string | null;
  itinerary: EventDetailItineraryItem[];
  status: string;
  sections: EventDetailSection[];
}

export interface EventDetailOrganizerInfo {
  name?: string;
  organizer_name?: string;
  email?: string;
  phone?: string;
  contact?: string;
  website?: string;
  [key: string]: unknown;
}

export interface EventDetail {
  id: number;
  category_id: number;
  category_name: string | null;
  category_slug: string | null;
  title: string;
  description: string;
  terms_and_conditions: string | null;
  venue: string;
  banner_image_url: string | null;
  static_map_image_url: string | null;
  min_age: number;
  max_tickets_per_user: number;
  map_config: unknown;
  stage_layout: unknown;
  amenities: string[];
  organizer_info: EventDetailOrganizerInfo;
  status: string;
  shows: EventDetailShow[];
}
