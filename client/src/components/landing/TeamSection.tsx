import { Star, Quote } from "lucide-react";

const TEAM = [
  { name: "Marcus Sterling", role: "Founder & CEO", bio: "Former head of Systematic Trading at a Tier-1 investment bank. Founded FXA Trade to bridge retail and institutional finance.", initials: "MS" },
  { name: "Elena Vance", role: "Chief Tech Officer", bio: "Cybersecurity architect with 15+ years in distributed ledger technology and high-performance matching engines.", initials: "EV" },
  { name: "Dr. Julian Thorne", role: "Head of Strategy", bio: "PhD in Quantitative Finance. Oversees algorithmic model development and institutional risk management.", initials: "JT" },
  { name: "Andreea Guzganu", role: "Global Operations", bio: "Leads legal and regulatory frameworks, ensuring SEC compliance and international financial standards.", initials: "AG" },
];

const TESTIMONIALS = [
  { name: "Alexander Novak", title: "Private Equity Analyst", text: "The matching engine is significantly faster than any retail terminal I've used. Execution speed during high-volatility events is truly institutional.", initials: "AN" },
  { name: "Dr. Sarah Chen", title: "Hedge Fund Manager", text: "Integration of traditional assets with crypto futures is seamless. Their compliance-first approach gives us confidence to scale.", initials: "SC" },
  { name: "Jameson Vane", title: "Serial Tech Investor", text: "They don't just offer a platform; they offer a competitive advantage. The ROI calculator is spot on.", initials: "JV" },
  { name: "Elena Rodriguez", title: "Quantitative Trader", text: "API documentation is clean and latency is minimal. Integrating our algorithmic models was straightforward.", initials: "ER" },
  { name: "David Chang", title: "Wealth Manager", text: "Our clients appreciate the transparent fee structure and diverse asset classes. Top-tier portfolio management tools.", initials: "DC" },
  { name: "Isabella Gomez", title: "Fintech Advisor", text: "User experience is intuitive yet powerful. They've successfully demystified complex trading for institutional-grade users.", initials: "IG" },
];

export function TeamSection() {
  return (
    <>
      {/* Team */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Architects of Finance</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            The Minds Behind <span className="text-accent">Pro-Level Systems</span>
          </h2>
          <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
            Our leadership combines decades of experience in traditional hedge funds, blockchain security, and quantitative research.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM.map((m) => (
            <div key={m.name} className="glass p-6 text-center group hover:border-accent/30 transition-all hover:-translate-y-1">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:border-accent/40 transition-colors">
                <span className="text-accent font-bold text-lg">{m.initials}</span>
              </div>
              <h3 className="font-semibold text-white">{m.name}</h3>
              <p className="text-xs text-accent font-medium mt-0.5 mb-3">{m.role}</p>
              <p className="text-xs text-broker-400 leading-relaxed">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-broker-700/50 bg-broker-800/20 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Global Sentiments</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Trusted by the <span className="text-accent">Financial Elite</span>
            </h2>
            <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
              Direct feedback from institutional partners and private investors utilizing our liquidity and algorithmic ecosystems.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass p-5 hover:border-accent/20 transition-all">
                <Quote className="w-6 h-6 text-accent/30 mb-3" />
                <p className="text-sm text-broker-300 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-broker-700/50">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-xs font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-broker-400">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
