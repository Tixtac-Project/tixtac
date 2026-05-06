export interface OverviewStats {
  totalRevenue: number;
  totalTicketsSold: number;
  dropOffRate: number;
  paidOrders: number;
  cancelledOrders: number;
}

export interface SalesVelocityPoint {
  period: string;
  revenue: number;
  tickets: number;
}

export interface DemographicsStats {
  gender: { male: number; female: number; other: number };
  ageGroups: { '13-17': number; '18-24': number; '25-34': number; '35-44': number; '45+': number };
  total: number;
}
