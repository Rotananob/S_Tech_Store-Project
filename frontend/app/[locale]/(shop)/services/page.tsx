"use client";
import { useState } from "react";
import { 
  Wrench, CheckCircle2, Laptop, Calendar, Clock, MapPin, 
  Phone, User, ShieldCheck, Sparkles, Check 
} from "lucide-react";
import { Link } from "@/i18n/routing";

const SERVICES = [
  { id: "screen", label: "Screen Replacement", price: 45, time: "1–2 hrs", icon: "🖥️", desc: "Cracked or dead display replacement for laptops & phones." },
  { id: "battery", label: "Battery Replacement", price: 25, time: "30 min", icon: "🔋", desc: "Original battery swap to restore full battery life." },
  { id: "keyboard", label: "Keyboard Repair", price: 30, time: "1 hr", icon: "⌨️", desc: "Fix sticky, broken, or unresponsive keys." },
  { id: "virus", label: "Virus / Malware Removal", price: 20, time: "2–3 hrs", icon: "🛡️", desc: "Deep scan, clean malware and optimize Windows." },
  { id: "upgrade", label: "RAM / SSD Upgrade", price: 15, time: "45 min", icon: "⚡", desc: "Boost your PC speed with more RAM or a faster SSD." },
  { id: "data", label: "Data Recovery", price: 60, time: "1–3 days", icon: "💾", desc: "Recover lost files from damaged or formatted drives." },
  { id: "cooling", label: "Cooling / Fan Cleaning", price: 18, time: "1 hr", icon: "❄️", desc: "Deep clean thermal paste & fans to stop overheating." },
  { id: "os", label: "OS Reinstall", price: 20, time: "2 hrs", icon: "💿", desc: "Fresh Windows 11 install with drivers and activation." },
];

const DEVICE_TYPES = ["Laptop", "Desktop PC", "Gaming PC", "MacBook", "All-in-One", "Other"];
const BRANDS = ["ASUS", "Lenovo", "HP", "Dell", "Acer", "MSI", "Apple", "Other"];
const TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function ServicesPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [device, setDevice] = useState("");
  const [brand, setBrand] = useState("");
  const [issue, setIssue] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dropoff, setDropoff] = useState<"walkin" | "pickup">("walkin");
  const [submitted, setSubmitted] = useState(false);

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const totalFee = selected.reduce((s, id) => {
    const svc = SERVICES.find(x => x.id === id);
    return s + (svc?.price ?? 0);
  }, 0);

  const handleSubmit = () => {
    if (!selected.length || !name || !phone || !date || !time) {
      alert("Please fill all required fields and select at least one service.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-gray-50 dark:bg-[#0c0e12] min-h-screen text-gray-900 dark:text-gray-100 transition-colors py-12 lg:py-20 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5 border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
            We'll contact <strong className="text-gray-900 dark:text-white">{name}</strong> at <strong className="text-gray-900 dark:text-white font-mono">{phone}</strong>
          </p>
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Appointment: {date} at {time} ({dropoff === "pickup" ? "Pickup" : "Walk-in"})
          </p>
          
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 mb-6 text-left border border-gray-100 dark:border-white/5 space-y-2">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Booked Services</p>
            {selected.map(id => {
              const svc = SERVICES.find(x => x.id === id)!;
              return (
                <div key={id} className="flex justify-between text-xs">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{svc.icon} {svc.label}</span>
                  <span className="font-bold font-mono text-[#8B1A1A] dark:text-red-400">${svc.price}</span>
                </div>
              );
            })}
            <div className="border-t border-gray-200 dark:border-white/10 pt-2.5 mt-2 flex justify-between font-black text-sm">
              <span className="text-gray-900 dark:text-white">Est. Total</span>
              <span className="text-[#8B1A1A] dark:text-red-400 font-mono">${totalFee + (dropoff === "pickup" ? 2 : 0)}</span>
            </div>
          </div>

          <Link 
            href="/" 
            className="block w-full py-3.5 rounded-xl bg-[#8B1A1A] hover:bg-[#6b1010] text-white font-bold text-sm shadow-md transition-all no-underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#0c0e12] min-h-screen text-gray-900 dark:text-gray-100 transition-colors pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-[#12151e] border-b border-gray-200 dark:border-white/10 py-8 lg:py-10">
        <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" />
            <span className="text-xs font-bold text-[#8B1A1A] dark:text-red-400 uppercase tracking-wider">Fast Hardware Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Repair & IT Services <span className="text-[#8B1A1A] dark:text-red-500">.</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl font-khmer">
            សេវាជួសជុល និងដំឡើងកុំព្យូទ័រ Laptop, Desktop និង Apple MacBooks ប្រកបដោយវិជ្ជាជីវៈ និងរហ័សទាន់ចិត្ត
          </p>
        </div>
      </div>

      <div className="container max-w-[1536px] 2xl:max-w-[1620px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">

          {/* LEFT: Steps */}
          <div className="space-y-6">

            {/* Step 1: Services Selection */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-xs shadow-xs">1</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">ជ្រើសរើសសេវាកម្ម • Select Services</h2>
                  <p className="text-xs text-gray-400">Choose one or multiple repair tasks</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {SERVICES.map(svc => {
                  const active = selected.includes(svc.id);
                  return (
                    <button 
                      key={svc.id} 
                      onClick={() => toggle(svc.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                        active 
                          ? "border-[#8B1A1A] bg-red-50/20 dark:bg-red-950/20 dark:border-red-500/60 ring-1 ring-[#8B1A1A]/30 shadow-xs" 
                          : "border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-2xl">{svc.icon}</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          active ? "bg-[#8B1A1A] border-[#8B1A1A] text-white" : "border-gray-300 dark:border-white/20"
                        }`}>
                          {active && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{svc.label}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{svc.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-xs">
                        <span className="font-black text-[#8B1A1A] dark:text-red-400 font-mono">From ${svc.price}</span>
                        <span className="text-gray-400 font-medium">⏱️ {svc.time}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Device Information */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-xs shadow-xs">2</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">ព័ត៌មានឧបករណ៍ • Device Information</h2>
                  <p className="text-xs text-gray-400">Tell us what brand and problem you are experiencing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Device Type *</label>
                  <select 
                    value={device} 
                    onChange={e => setDevice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]"
                  >
                    <option value="">Select device...</option>
                    {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Brand</label>
                  <select 
                    value={brand} 
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]"
                  >
                    <option value="">Select brand...</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Describe the Issue</label>
                <textarea 
                  value={issue} 
                  onChange={e => setIssue(e.target.value)} 
                  rows={3}
                  placeholder="e.g. Screen has black lines, laptop gets hot and shuts down, keyboard keys not working..."
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] resize-none"
                />
              </div>
            </section>

            {/* Step 3: Appointment & Contact */}
            <section className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center font-bold text-xs shadow-xs">3</div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">ការណាត់ជួប • Appointment & Contact</h2>
                  <p className="text-xs text-gray-400">Choose drop-off method and preferred schedule</p>
                </div>
              </div>

              {/* Drop-off options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                {[
                  { id: "walkin", label: "Walk-in / Drop-off", sub: "Bring device to our store in St. 271", icon: "🏪" },
                  { id: "pickup", label: "Pickup Service", sub: "We collect from your home (+$2.00)", icon: "🚗" },
                ].map(opt => (
                  <button 
                    key={opt.id} 
                    onClick={() => setDropoff(opt.id as typeof dropoff)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                      dropoff === opt.id 
                        ? "border-[#8B1A1A] bg-red-50/20 dark:bg-red-950/20 dark:border-red-500/60 ring-1 ring-[#8B1A1A]/30 shadow-xs" 
                        : "border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Sok San"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="012 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A] font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Preferred Date *</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Time Slot *</label>
                  <select 
                    value={time} 
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#8B1A1A]"
                  >
                    <option value="">Select time...</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </section>

          </div>

          {/* RIGHT: Booking Summary Sticky Desktop Card */}
          <div className="bg-white dark:bg-[#151922] border border-gray-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm sticky top-24 space-y-5">
            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-4">
              <Sparkles size={18} className="text-[#8B1A1A] dark:text-red-400" />
              <span>Booking Summary</span>
            </h2>

            {selected.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                <Wrench size={32} className="mx-auto mb-2 opacity-40" />
                <p>No services selected yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selected.map(id => {
                  const svc = SERVICES.find(x => x.id === id)!;
                  return (
                    <div key={id} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{svc.icon} {svc.label}</p>
                        <p className="text-[11px] text-gray-400">{svc.time}</p>
                      </div>
                      <span className="font-bold font-mono text-[#8B1A1A] dark:text-red-400">${svc.price}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {dropoff === "pickup" && selected.length > 0 && (
              <div className="flex justify-between items-center text-xs pt-3 border-t border-gray-100 dark:border-white/5">
                <span className="text-gray-500">🚗 Pickup Fee</span>
                <span className="font-bold font-mono">$2.00</span>
              </div>
            )}

            {selected.length > 0 && (
              <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Est. Total</span>
                  <span className="text-2xl font-black text-[#8B1A1A] dark:text-red-400 font-mono">
                    ${(totalFee + (dropoff === "pickup" ? 2 : 0)).toFixed(2)}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-400 font-khmer">
                  ≈{((totalFee + (dropoff === "pickup" ? 2 : 0)) * 4060).toLocaleString()} ៛
                </div>
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={selected.length === 0}
              className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-md disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#8B1A1A] to-red-600 hover:from-[#6B1010] hover:to-[#8B1A1A] text-white"
            >
              <Calendar size={16} />
              <span>Book Appointment</span>
            </button>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Store Information</p>
              <p className="flex items-center gap-2"><MapPin size={13} className="text-[#8B1A1A]" /> St. 271, Phnom Penh</p>
              <p className="flex items-center gap-2"><Clock size={13} className="text-[#8B1A1A]" /> Mon–Sat: 8AM – 6PM</p>
              <p className="flex items-center gap-2"><Phone size={13} className="text-[#8B1A1A]" /> +855 12 345 678</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
