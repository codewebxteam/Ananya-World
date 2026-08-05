export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Field Staff' | 'Lab Staff' | 'Admin';
  status: 'Online' | 'Offline';
  salary: {
    base: number;
    hourlyRate: number;
  };
  avatar: string;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  punchIn: string;
  punchOut?: string;
  duration?: string;
  status: 'Present' | 'Absent' | 'Late';
  inGeofence: boolean;
  latitude: number;
  longitude: number;
}

export interface SalarySlip {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  year: number;
  baseSalary: number;
  attendanceDays: number;
  deductions: number;
  allowances: number;
  finalSalary: number;
  status: 'Paid' | 'Processing' | 'Pending';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  file?: {
    name: string;
    url: string;
    type: 'image' | 'document' | 'file';
    size: string;
  };
}
