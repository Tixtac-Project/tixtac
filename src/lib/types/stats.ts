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
  ageGroups: {
    '< 6': number; // Preschooler
    '6-11': number; // Children
    '12-15': number; // Young Teens
    '16-18': number; // Older Teens
    '19-22': number; // Uni Students
    '23-29': number; // Early Career
    '30-39': number; // Established
    '40-49': number; // Middle-aged
    '50-60': number; // Mature
    '> 60': number; // Seniors
  };
  total: number;
}
