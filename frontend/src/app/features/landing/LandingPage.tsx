import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Briefcase, Star, Users, CheckCircle, Shield, Search, X, ArrowRight } from 'lucide-react';
import { categoryService } from '../../services/api';
import type { Category } from '../../types';

const stats = [
  { label: 'Verified Workers', value: '10,000+', icon: Users },
  { label: 'Services Completed', value: '50,000+', icon: CheckCircle },
  { label: 'Average Rating', value: '4.8/5', icon: Star },
  { label: 'Background Verified', value: '100%', icon: Shield },
];

const testimonials = [
  { name: 'Priya Sharma', role: 'Customer', comment: 'Found a reliable cook within minutes. Highly recommend!', rating: 5 },
  { name: 'Raj Kumar', role: 'Customer', comment: 'Professional service. The driver was punctual and courteous.', rating: 5 },
  { name: 'Anjali Singh', role: 'Customer', comment: 'Best platform for finding household help. Very convenient!', rating: 5 },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['categories', 'visible', 'sequence'],
    queryFn: () => categoryService.getVisible('sequence'),
  });
  const categories = categoriesQuery.data ?? [];
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const serviceOptions = categories.flatMap((category) => [
    {
      key: `category-${category.id}`,
      name: category.name,
      categoryName: category.name,
      isSubCategory: false,
    },
    ...(category.subCategories ?? []).map((subCategory) => ({
      key: `subcategory-${subCategory.id}`,
      name: subCategory.name,
      categoryName: category.name,
      isSubCategory: true,
    })),
  ]);
  const categoryOptions = serviceOptions.filter((option) => !option.isSubCategory);
  const filtered = query.trim()
    ? serviceOptions.filter((service) =>
        `${service.name} ${service.categoryName}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : categoryOptions;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleServiceClick = (name: string) => {
    setSelectedService(name);
    setShowDropdown(false);
    setQuery(name);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-sans">

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-400 uppercase tracking-[0.2em] font-medium">One more step</p>
              <h2 className="text-2xl font-black text-black dark:text-white">Book a {selectedService}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Sign in or create a free account to browse and book verified {selectedService.toLowerCase()}s near you.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full h-11 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-semibold text-sm"
                onClick={() => navigate('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 border-neutral-300 dark:border-neutral-700 text-black dark:text-white font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                onClick={() => navigate('/auth/register')}
              >
                Create Free Account
              </Button>
            </div>
            <p className="text-center text-xs text-neutral-400">100% free to sign up · No credit card required</p>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="font-black text-xl tracking-widest text-black dark:text-white">INSTAFF</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                onClick={() => navigate('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                className="bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white text-sm font-semibold h-9 px-5"
                onClick={() => navigate('/auth/register')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO — light, professional */}
      <section className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-12">

            {/* Left */}
            <div className="space-y-6 max-w-xl">
              <Badge className="bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-semibold px-3 py-1 rounded-full border-0">
                India's Most Trusted Workforce Platform
              </Badge>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-black dark:text-white">
                Verified Workers,<br />
                <span className="text-neutral-400 dark:text-neutral-500">in Minutes.</span>
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg leading-relaxed">
                Find background-checked maids, cooks, drivers, nurses and more — instantly or scheduled, at your doorstep.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button
                  className="h-11 px-7 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-white font-semibold text-sm"
                  onClick={() => navigate('/auth/register')}
                >
                  Find Workers
                </Button>
                <Button
                  variant="outline"
                  className="h-11 px-7 border-neutral-300 dark:border-neutral-700 text-black dark:text-white font-semibold text-sm hover:bg-white dark:hover:bg-neutral-800"
                  onClick={() => navigate('/auth/register')}
                >
                  Become a Worker
                </Button>
              </div>
            </div>

            {/* Right — search card */}
            <div className="w-full md:w-96">
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <p className="text-sm font-semibold text-black dark:text-white mb-1">What are you looking for?</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Search from our verified service categories</p>
                </div>
                <div className="relative" ref={searchRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <Input
                        placeholder="e.g. Maid, Cook, Driver..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        className="h-11 pl-9 text-sm border-neutral-200 dark:border-neutral-700 focus-visible:ring-black dark:focus-visible:ring-white"
                      />
                    </div>
                    <Button
                      size="icon"
                      className="h-11 w-11 bg-black hover:bg-neutral-800 dark:bg-white dark:text-black text-white shrink-0"
                      onClick={() => { if (filtered.length === 1) handleServiceClick(filtered[0].name); else setShowDropdown(v => !v); }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden z-40">
                      {categoriesQuery.isLoading ? (
                        <div className="px-4 py-4 text-sm text-neutral-500 text-center">Loading services…</div>
                      ) : categoriesQuery.isError ? (
                        <div className="px-4 py-4 text-sm text-red-600 text-center">Unable to load services. Please try again.</div>
                      ) : filtered.length > 0 ? filtered.map(service => (
                        <button
                          key={service.key}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left group"
                          onClick={() => handleServiceClick(service.name)}
                        >
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-black dark:group-hover:bg-white transition-colors">
                            <Briefcase className="w-4 h-4 text-neutral-500 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-black transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-black dark:text-white">{service.name}</p>
                            <p className="text-xs text-neutral-400">
                              {service.isSubCategory ? service.categoryName : 'Category'}
                            </p>
                          </div>
                        </button>
                      )) : (
                        <div className="px-4 py-4 text-sm text-neutral-500 text-center">No services found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick chips */}
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 4).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleServiceClick(cat.name)}
                      className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors font-medium"
                    >
                      {cat.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowDropdown(true)}
                    className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors font-medium"
                  >
                    Browse all
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100 dark:divide-neutral-800">
            {stats.map((stat, idx) => (
              <div key={stat.label} className={`text-center py-4 px-6 ${idx > 0 ? '' : ''}`}>
                <p className="text-3xl md:text-4xl font-black text-black dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-[0.2em] font-medium mb-2">What We Offer</p>
              <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white">Browse Categories</h2>
            </div>
            <button
              onClick={() => navigate('/auth/register')}
              className="text-sm font-semibold text-black dark:text-white underline underline-offset-4 hover:opacity-60 transition-opacity self-start md:self-auto"
            >
              View all services →
            </button>
          </div>

          {categoriesQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-neutral-500">Loading categories…</p>
          ) : categoriesQuery.isError ? (
            <p className="py-8 text-center text-sm text-red-600">Unable to load categories. Please try again later.</p>
          ) : categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">No categories are available right now.</p>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="group cursor-pointer bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 text-center space-y-3 hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-md transition-all duration-200"
                onClick={() => handleServiceClick(category.name)}
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white transition-colors duration-200">
                  <Briefcase className="w-5 h-5 text-neutral-500 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-black transition-colors duration-200" />
                </div>
                <p className="font-semibold text-sm text-black dark:text-white">{category.name}</p>
                <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0 font-medium">
                  Available
                </Badge>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs text-neutral-400 uppercase tracking-[0.2em] font-medium mb-2">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Search', desc: 'Browse verified workers by category, location, and availability.' },
              { step: '02', title: 'Book', desc: 'Instant or scheduled bookings with transparent pricing upfront.' },
              { step: '03', title: 'Done', desc: 'Worker arrives, job gets done. Rate and review after service.' },
            ].map((item, idx) => (
              <div key={idx} className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-3">
                <p className="text-5xl font-black text-neutral-200 dark:text-neutral-700 leading-none">{item.step}</p>
                <p className="text-xl font-black text-black dark:text-white">{item.title}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs text-neutral-400 uppercase tracking-[0.2em] font-medium mb-2">Customer Stories</p>
            <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white">What People Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-none bg-white dark:bg-neutral-950">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">"{testimonial.comment}"</p>
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-600 dark:text-neutral-300">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-black dark:text-white">{testimonial.name}</p>
                      <p className="text-xs text-neutral-400">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER — black only here, as accent */}
      <section className="py-16 bg-black dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-neutral-500 text-xs uppercase tracking-[0.2em] font-medium">Get Started Today</p>
          <h2 className="text-4xl md:text-5xl font-black text-white">Ready to find help?</h2>
          <p className="text-neutral-400 text-base max-w-md mx-auto">
            Join thousands of households already using INSTAFF for reliable, verified home staffing.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              className="h-11 px-8 bg-white hover:bg-neutral-200 text-black font-semibold text-sm"
              onClick={() => navigate('/auth/register')}
            >
              Find Workers
            </Button>
            <Button
              variant="outline"
              className="h-11 px-8 border-neutral-600 text-white hover:bg-neutral-800 hover:text-white bg-transparent font-semibold text-sm"
              onClick={() => navigate('/auth/register')}
            >
              Become a Worker
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xl font-black tracking-widest text-black dark:text-white">INSTAFF</span>
            <p className="text-neutral-400 text-xs">India's Most Trusted Workforce Platform</p>
            <p className="text-neutral-400 text-xs">© 2026 INSTAFF. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
