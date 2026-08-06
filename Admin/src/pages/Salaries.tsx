import React from 'react';
import { 
  Users, ChevronDown,
  Calendar, Wallet, CreditCard, Hourglass, 
  Clock4, Play, FileText, CheckCircle2, FileCheck, Eye
} from 'lucide-react';

export default function Salaries() {
  const payrollSummaryData = [
    { id: 1, dept: 'Field Operations', employees: 96, payable: '7,25,000', paid: '2,85,000', processing: '3,45,000', pending: '95,000', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { id: 2, dept: 'Laboratory', employees: 54, payable: '4,50,000', paid: '1,80,000', processing: '2,10,000', pending: '60,000', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { id: 3, dept: 'Logistics', employees: 32, payable: '2,75,000', paid: '1,15,000', processing: '1,25,000', pending: '35,000', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    { id: 4, dept: 'Customer Support', employees: 38, payable: '2,25,000', paid: '90,000', processing: '1,05,000', pending: '30,000', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { id: 5, dept: 'HR & Admin', employees: 36, payable: '2,00,250', paid: '75,000', processing: '35,250', pending: '90,000', iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {/* ----- TOP STATS ROW ----- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><Wallet size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Total Payroll (Aug 2025)</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ 18,75,250</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium">Monthly Payroll</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 shrink-0"><CreditCard size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Paid</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ 6,45,000</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium"><span className="text-green-500 font-bold">34.40%</span> of Total</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><Hourglass size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Processing</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ 9,20,250</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium"><span className="text-orange-500 font-bold">49.06%</span> of Total</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0"><Clock4 size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Pending</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">₹ 3,10,000</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium"><span className="text-red-500 font-bold">16.54%</span> of Total</p>
        </div>

        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><Users size={24} strokeWidth={2} /></div>
            <div>
              <p className="text-gray-500 text-[11px] font-medium mb-1">Total Employees</p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">256</h3>
            </div>
          </div>
          <p className="text-gray-500 text-[11px] mt-3 ml-[64px] font-medium">Active Employees</p>
        </div>
      </div>

      {/* ----- CHARTS SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* 1. Payroll Overview */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-gray-900 font-bold text-[15px] mb-6">Payroll Overview <span className="text-gray-400 font-normal text-xs">(Aug 2025)</span></h3>
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center shrink-0" 
                 style={{ background: 'conic-gradient(#10B981 0% 60%, #3B82F6 60% 80%, #F59E0B 80% 92%, #EF4444 92% 100%)' }}>
              <div className="absolute w-[100px] h-[100px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="text-gray-500 text-[10px] font-medium mb-0.5">Total</span>
                <span className="text-[13px] font-bold text-gray-900">₹ 18,75,250</span>
              </div>
            </div>
            <div className="flex-1 space-y-3.5 pl-2">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Basic Salary</span></div>
                <span className="text-gray-900 font-bold">₹ 11,25,000 <span className="text-gray-400 font-normal">(60.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">Allowances</span></div>
                <span className="text-gray-900 font-bold">₹ 3,75,250 <span className="text-gray-400 font-normal">(20.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Deductions</span></div>
                <span className="text-gray-900 font-bold">₹ 2,25,000 <span className="text-gray-400 font-normal">(12.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">Bonus & Incentives</span></div>
                <span className="text-gray-900 font-bold">₹ 1,50,000 <span className="text-gray-400 font-normal">(8.00%)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Payroll Trend (Line Chart) */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col relative">
          <h3 className="text-gray-900 font-bold text-[15px] mb-1">Payroll Trend <span className="text-gray-400 font-normal text-xs">(Last 6 Months)</span></h3>
          <p className="text-gray-400 text-[10px] mb-2">(₹ in Lakhs)</p>
          
          <div className="flex-1 relative w-full mt-2 min-h-[140px]">
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-400 w-4 text-right pr-1">
              <span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span>
            </div>
            
            {/* Graph Area */}
            <div className="absolute left-6 right-2 top-2 bottom-6 border-l border-b border-gray-200">
              <div className="absolute w-full border-t border-gray-100 top-[20%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[40%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[60%]"></div>
              <div className="absolute w-full border-t border-gray-100 top-[80%]"></div>
              
              {/* SVG Line with Fill Area */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gradientBlue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path d="M 0,50 L 20,47 L 40,40 L 60,34 L 80,31 L 100,25 L 100,100 L 0,100 Z" fill="url(#gradientBlue)" />
                {/* Line */}
                <path d="M 0,50 L 20,47 L 40,40 L 60,34 L 80,31 L 100,25" fill="none" stroke="#3B82F6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {/* Points */}
                <circle cx="0" cy="50" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                <circle cx="20" cy="47" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                <circle cx="40" cy="40" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                <circle cx="60" cy="34" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                <circle cx="80" cy="31" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                <circle cx="100" cy="25" r="3" fill="#3B82F6" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
              </svg>

              {/* Point Labels */}
              <div className="absolute inset-0 w-full h-full">
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '0%', top: '40%', transform: 'translateX(-50%)' }}>12.45</span>
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '20%', top: '37%', transform: 'translateX(-50%)' }}>13.20</span>
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '40%', top: '30%', transform: 'translateX(-50%)' }}>14.80</span>
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '60%', top: '24%', transform: 'translateX(-50%)' }}>16.40</span>
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '80%', top: '21%', transform: 'translateX(-50%)' }}>17.25</span>
                <span className="absolute text-[9px] font-bold text-gray-700" style={{ left: '100%', top: '15%', transform: 'translateX(-50%)' }}>18.75</span>
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="absolute left-6 right-2 bottom-0 flex justify-between text-[10px] text-gray-400 font-medium transform translate-y-full pt-1">
              <span>Mar 2025</span><span>Apr 2025</span><span>May 2025</span><span>Jun 2025</span><span>Jul 2025</span><span>Aug 2025</span>
            </div>
          </div>
        </div>

        {/* 3. Salary Distribution by Department */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900 font-bold text-[15px]">Salary Distribution <span className="text-gray-400 font-normal text-xs ml-0.5">by Department</span></h3>
            <div className="relative">
              <select className="bg-white border border-gray-200 rounded-lg pl-2 pr-6 py-1 text-[10px] text-gray-600 appearance-none cursor-pointer focus:outline-none">
                <option>Last 6 Months</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center shrink-0" 
                 style={{ background: 'conic-gradient(#10B981 0% 38.67%, #3B82F6 38.67% 58.67%, #F59E0B 58.67% 73.34%, #8B5CF6 73.34% 85.34%, #EF4444 85.34% 100%)' }}>
              <div className="absolute w-[80px] h-[80px] bg-white rounded-full"></div>
              {/* Creating white gaps between segments manually using thin pseudo elements or just letting simple gradient be */}
            </div>
            
            <div className="flex-1 space-y-2.5">
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-gray-600 font-medium">Field Operations</span></div>
                <span className="text-gray-900 font-bold">₹ 7,25,000 <span className="text-gray-400 font-normal">(38.67%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-gray-600 font-medium">Laboratory</span></div>
                <span className="text-gray-900 font-bold">₹ 4,50,000 <span className="text-gray-400 font-normal">(20.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-gray-600 font-medium">Logistics</span></div>
                <span className="text-gray-900 font-bold">₹ 2,75,000 <span className="text-gray-400 font-normal">(14.67%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-gray-600 font-medium">Customer Support</span></div>
                <span className="text-gray-900 font-bold">₹ 2,25,000 <span className="text-gray-400 font-normal">(12.00%)</span></span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-gray-600 font-medium">HR & Admin</span></div>
                <span className="text-gray-900 font-bold">₹ 2,00,250 <span className="text-gray-400 font-normal">(10.66%)</span></span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-auto pt-3 flex justify-between items-center">
            <span className="text-gray-600 text-xs font-medium">Total</span>
            <span className="text-[#2563EB] text-lg font-bold">₹ 18,75,250</span>
          </div>
        </div>

      </div>

      {/* ----- BOTTOM SECTION ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Panel: Payroll Summary Table */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <h3 className="text-gray-900 font-bold text-lg">Payroll Summary <span className="text-gray-400 font-normal text-sm ml-1">(Aug 2025)</span></h3>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 bg-white border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                <FileText size={16} strokeWidth={2.5} /> Salary Structure
              </button>
              <button className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-blue-200">
                <Play size={16} strokeWidth={2.5} fill="currentColor" /> Run Payroll
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Employees</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Payable (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Paid (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Processing (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending (₹)</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payrollSummaryData.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${row.iconBg} ${row.iconColor}`}>
                        <Users size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-800">{row.dept}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] font-medium text-gray-600 text-center">{row.employees}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-gray-900">₹ {row.payable}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-green-600">₹ {row.paid}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-orange-500">₹ {row.processing}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-red-500">₹ {row.pending}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/30">
                  <td className="py-4 px-4 text-[14px] font-bold text-gray-900">Total</td>
                  <td className="py-4 px-4 text-[14px] font-bold text-gray-900 text-center">256</td>
                  <td className="py-4 px-4 text-[14px] font-bold text-gray-900">₹ 18,75,250</td>
                  <td className="py-4 px-4 text-[14px] font-bold text-green-600">₹ 6,45,000</td>
                  <td className="py-4 px-4 text-[14px] font-bold text-orange-500">₹ 9,20,250</td>
                  <td className="py-4 px-4 text-[14px] font-bold text-red-500">₹ 3,10,000</td>
                  <td className="py-4 px-4 text-center text-gray-400">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-4 font-medium">Showing 1 to 5 of 5 departments</p>
        </div>

        {/* Right Panel: Side Widgets */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Upcoming Salary Dates */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-gray-900 font-bold text-[15px]">Upcoming Salary Dates</h3>
              <span className="text-blue-500 text-[11px] font-bold cursor-pointer hover:underline">View Calendar</span>
            </div>
            <div className="space-y-4">
              {[
                { date: '10 Aug 2025 (Sun)', count: '25 Staff', color: 'text-green-600 bg-green-50' },
                { date: '15 Aug 2025 (Fri)', count: '42 Staff', color: 'text-blue-600 bg-blue-50' },
                { date: '20 Aug 2025 (Wed)', count: '31 Staff', color: 'text-orange-500 bg-orange-50' },
                { date: '25 Aug 2025 (Mon)', count: '18 Staff', color: 'text-purple-600 bg-purple-50' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg">
                      <Calendar size={16} className="text-gray-500" strokeWidth={2} />
                    </div>
                    <span className="text-gray-700 text-sm font-medium">{item.date}</span>
                  </div>
                  <span className={`${item.color} text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/0`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payroll Activities */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex-1">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-gray-900 font-bold text-[15px]">Recent Payroll Activities</h3>
              <span className="text-blue-500 text-[11px] font-bold cursor-pointer hover:underline">View All</span>
            </div>
            <div className="space-y-5">
              <div className="flex gap-3 items-start">
                <div className="bg-green-50 p-1.5 rounded-full mt-0.5"><CheckCircle2 size={18} className="text-green-500" strokeWidth={2.5} /></div>
                <div>
                  <h4 className="text-gray-900 text-[13px] font-bold mb-0.5">Payroll for Field Operations processed</h4>
                  <p className="text-gray-400 text-[10px] font-medium">By Admin User • Today, 09:15 AM</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-orange-50 p-1.5 rounded-full mt-0.5"><Clock4 size={18} className="text-orange-500" strokeWidth={2.5} /></div>
                <div>
                  <h4 className="text-gray-900 text-[13px] font-bold mb-0.5">Payroll is being processed for Laboratory</h4>
                  <p className="text-gray-400 text-[10px] font-medium">By Admin User • Today, 09:00 AM</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="bg-blue-50 p-1.5 rounded-full mt-0.5"><FileCheck size={18} className="text-blue-500" strokeWidth={2.5} /></div>
                <div>
                  <h4 className="text-gray-900 text-[13px] font-bold mb-0.5">Salary slip generated for 25 employees</h4>
                  <p className="text-gray-400 text-[10px] font-medium">By Admin User • Yesterday, 06:30 PM</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}