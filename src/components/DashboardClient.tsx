"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Search,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Building2,
  MapPin,
  Star,
  Copy,
  ChevronRight,
  TrendingUp,
  X,
  RefreshCw,
  PhoneCall,
  UserCheck,
  Calendar,
  Award,
  PlusCircle,
  Radio,
  SlidersHorizontal,
  ArrowUpRight,
  Send,
  HelpCircle,
  Globe,
  Flame,
  Zap,
} from "lucide-react";
import {
  updateLeadStatus,
  markWhatsAppOpened,
  reAuditLead,
  addInteraction,
  discoverGooglePlacesAction,
  discoverFreeLeadsAction,
  quickAddLead,
} from "@/app/actions";

interface LeadWithRelations {
  id: string;
  name: string;
  category: string;
  niche: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  status: string;
  leadScore: number | null;
  scoreReason: string | null;
  scoreBreakdown: string | null;
  notes: string | null;
  source: string;
  audit: {
    id: string;
    hasWebsite: boolean;
    isAccessible: boolean;
    statusCode: number | null;
    loadTimeMs: number | null;
    isMobileResponsive: boolean;
    hasSsl: boolean;
    hasMetaTags: boolean;
    title: string | null;
    metaDescription: string | null;
    hasOnlineOrdering: boolean;
    hasBookingSystem: boolean;
    hasWhatsAppWidget: boolean;
    hasSocialLinks: boolean;
    socialLinks: string | null;
    identifiedIssues: string;
    opportunities: string | null;
    auditSummary: string;
  } | null;
  pitches: {
    id: string;
    recommendedService: string;
    suggestedOffer: string;
    pricePoint: string | null;
    turnaroundDays: number;
    openingMessage: string;
    openingMessageHinglish?: string | null;
    followUpMessage: string;
    followUpMessageHinglish?: string | null;
    demoUrl?: string | null;
    likelyObjections: string | null;
    status: string;
    dispatchedAt: Date | null;
  }[];
  interactions: {
    id: string;
    type: string;
    content: string;
    createdAt: Date;
  }[];
}

interface Props {
  initialLeads: LeadWithRelations[];
  stats: {
    totalLeads: number;
    highPriority: number;
    outreachReady: number;
    contacted: number;
    interested: number;
    meetings: number;
    won: number;
  };
}

export default function DashboardClient({ initialLeads, stats }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedNiche, setSelectedNiche] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"pitch" | "audit" | "score" | "history">("pitch");
  const [quickNote, setQuickNote] = useState("");

  // Modals for live API discovery, quick add, and daily outreach sprint
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintIndex, setSprintIndex] = useState(0);
  const [sprintLanguage, setSprintLanguage] = useState<"hinglish" | "english">("hinglish");
  const [pitchLanguage, setPitchLanguage] = useState<"hinglish" | "english">("hinglish");

  // Free OpenStreetMap Auto-Discovery state (100% Free, zero API key)
  const [discoveryMode, setDiscoveryMode] = useState<"free" | "google">("free");
  const [freeDiscoveryCity, setFreeDiscoveryCity] = useState("Zirakpur");
  const [freeDiscoveryCategory, setFreeDiscoveryCategory] = useState<any>("all");
  const [freeDiscoveryCount, setFreeDiscoveryCount] = useState(35);

  // Discovery state
  const [discoveryQuery, setDiscoveryQuery] = useState("cafes in Zirakpur VIP Road");
  const [discoveryCity, setDiscoveryCity] = useState("Zirakpur");
  const [discoveryNiche, setDiscoveryNiche] = useState("Food & Beverage");
  const [discoveryApiKey, setDiscoveryApiKey] = useState("");
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  // Quick Add state
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadCategory, setNewLeadCategory] = useState("Café");
  const [newLeadNiche, setNewLeadNiche] = useState("Food & Beverage");
  const [newLeadCity, setNewLeadCity] = useState("Zirakpur");
  const [newLeadArea, setNewLeadArea] = useState("VIP Road");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadWebsite, setNewLeadWebsite] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return initialLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.category.toLowerCase().includes(search.toLowerCase()) ||
        (lead.area && lead.area.toLowerCase().includes(search.toLowerCase())) ||
        (lead.phone && lead.phone.includes(search));

      const matchesCity = selectedCity === "ALL" || lead.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesNiche = selectedNiche === "ALL" || lead.niche === selectedNiche;
      const matchesStatus = selectedStatus === "ALL" || lead.status === selectedStatus;

      return matchesSearch && matchesCity && matchesNiche && matchesStatus;
    });
  }, [initialLeads, search, selectedCity, selectedNiche, selectedStatus]);

  // Daily Sprint Leads (Leads ready to be contacted on WhatsApp)
  const sprintLeads = useMemo(() => {
    return initialLeads.filter(
      (l) =>
        (l.status === "OUTREACH_READY" || l.status === "DISCOVERED" || l.status === "QUALIFIED") &&
        Boolean(l.whatsappPhone)
    );
  }, [initialLeads]);

  const handleOpenWhatsApp = (lead: LeadWithRelations, customMsg?: string) => {
    const pitch = lead.pitches[0];
    if (!pitch || !lead.whatsappPhone) return;

    let textToSend = customMsg;
    if (!textToSend) {
      textToSend =
        pitchLanguage === "hinglish" && pitch.openingMessageHinglish
          ? pitch.openingMessageHinglish
          : pitch.openingMessage;
    }

    const encodedText = encodeURIComponent(textToSend);
    const waUrl = `https://wa.me/${lead.whatsappPhone}?text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");

    startTransition(async () => {
      await markWhatsAppOpened(lead.id, pitch.id);
    });
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    startTransition(async () => {
      await updateLeadStatus(leadId, newStatus);
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    });
  };

  const handleAddNote = (leadId: string) => {
    if (!quickNote.trim()) return;
    startTransition(async () => {
      await addInteraction(leadId, "NOTE", quickNote.trim());
      setQuickNote("");
    });
  };

  const handleCopyPitch = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchId(id);
    setTimeout(() => setCopiedPitchId(null), 2500);
  };

  const handleRunFreeDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscoveryLoading(true);
    setDiscoveryMessage(null);

    try {
      const result = await discoverFreeLeadsAction(
        freeDiscoveryCity,
        freeDiscoveryCategory,
        freeDiscoveryCount
      );
      setDiscoveryMessage(
        `Success! Discovered ${result.totalFound} businesses, audited and prepared ${result.newImported} new leads for daily outreach.`
      );
      setTimeout(() => {
        if (result.newImported > 0) {
          setShowDiscoveryModal(false);
          setDiscoveryMessage(null);
        }
      }, 2000);
    } catch (err: any) {
      setDiscoveryMessage(`Free discovery failed: ${err.message}`);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleRunDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscoveryLoading(true);
    setDiscoveryMessage(null);

    try {
      const result = await discoverGooglePlacesAction(
        discoveryQuery,
        discoveryCity,
        discoveryNiche,
        discoveryApiKey
      );
      setDiscoveryMessage(
        `Successfully synced! Found ${result.totalFound} businesses, imported and audited ${result.newImported} new leads.`
      );
      setTimeout(() => {
        if (result.newImported > 0) {
          setShowDiscoveryModal(false);
          setDiscoveryMessage(null);
        }
      }, 2000);
    } catch (err: any) {
      setDiscoveryMessage(`Sync failed: ${err.message}`);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    setQuickAddLoading(true);
    setQuickAddError(null);

    try {
      await quickAddLead({
        name: newLeadName.trim(),
        category: newLeadCategory,
        niche: newLeadNiche,
        city: newLeadCity,
        area: newLeadArea.trim() || undefined,
        phone: newLeadPhone.trim() || undefined,
        websiteUrl: newLeadWebsite.trim() || undefined,
      });

      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadWebsite("");
      setShowQuickAddModal(false);
    } catch (err: any) {
      setQuickAddError(err.message);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return "bg-slate-100 text-slate-600 border-slate-200";
    if (score >= 85) return "bg-emerald-50 text-emerald-800 border-emerald-200/90";
    if (score >= 70) return "bg-amber-50 text-amber-800 border-amber-200/90";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OUTREACH_READY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Ready
          </span>
        );
      case "CONTACTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Contacted
          </span>
        );
      case "REPLIED_INTERESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Interested 🔥
          </span>
        );
      case "MEETING_SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Meeting Booked
          </span>
        );
      case "WON":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
            Client Won 🎉
          </span>
        );
      case "OPTED_OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Opted Out
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 pb-20 font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-600/20">
              CB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-slate-900 text-base">
                  CodeBerry Technologies
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 font-semibold">
                  Sprint Mode
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Client Acquisition Engine • Target: 1–2 Clients by Oct 31 • Dhakoli, Zirakpur & Panchkula
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSprintIndex(0);
                setShowSprintModal(true);
              }}
              disabled={sprintLeads.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Daily Sprint ({sprintLeads.length} Ready)</span>
            </button>

            <button
              onClick={() => {
                setDiscoveryMode("free");
                setShowDiscoveryModal(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Harvest 30–40 Leads</span>
            </button>

            <button
              onClick={() => setShowQuickAddModal(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Add Business</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Total Pipeline</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.totalLeads}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Audited & verified</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>High Priority (80+)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.highPriority}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Prime conversion candidates</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Outreach Ready</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{stats.outreachReady}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Custom draft prepared</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Contacted</span>
              <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600">{stats.contacted}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">WhatsApp drafts opened</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Interest / Calls</span>
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              {stats.interested + stats.meetings}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active prospects</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span>Target Goal</span>
              <Award className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">
              {stats.won} / 2
            </div>
            <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
              Goal: ₹15k–₹25k by Oct 31
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by business name, street, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Niches</option>
                <option value="Food & Beverage">Food & Beverage (Cafés/Restaurants)</option>
                <option value="Beauty & Wellness">Beauty & Wellness (Salons/Spas)</option>
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Cities</option>
                <option value="Zirakpur">Zirakpur</option>
                <option value="Panchkula">Panchkula</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OUTREACH_READY">Outreach Ready</option>
                <option value="CONTACTED">Contacted</option>
                <option value="REPLIED_INTERESTED">Interested</option>
                <option value="MEETING_SCHEDULED">Meeting Booked</option>
                <option value="WON">Won Client</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lead Table / List */}
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Showing {filteredLeads.length} verified businesses</span>
            <span className="hidden sm:inline">Ranked by Transparent Opportunity Score (0–100)</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredLeads.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base">Your Pipeline is Fresh and Clean</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All previous mock leads have been removed. Click below to harvest 30–40 live local businesses (schools, hospitals, cafes, bakeries, small businesses, agencies).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDiscoveryMode("free");
                    setShowDiscoveryModal(true);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Harvest 30–40 Leads for Today</span>
                </button>
              </div>
            ) : (
              filteredLeads.map((lead) => {
              const audit = lead.audit;
              const pitch = lead.pitches[0];
              const issues: string[] = audit ? JSON.parse(audit.identifiedIssues || "[]") : [];

              return (
                <div
                  key={lead.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Business Info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base hover:text-emerald-700 transition-colors">
                        {lead.name}
                      </h3>
                      {getStatusBadge(lead.status)}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {lead.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {lead.area ? `${lead.area}, ${lead.city}` : lead.city}
                      </span>

                      {lead.rating && (
                        <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {lead.rating} ({lead.reviewCount || 0} reviews)
                        </span>
                      )}

                      <span>
                        {lead.websiteUrl ? (
                          <a
                            href={lead.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 font-medium"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                            {lead.websiteUrl.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No Independent Website</span>
                        )}
                      </span>
                    </div>

                    {/* Verified Issue / Opportunity Banner */}
                    <div className="text-xs text-slate-700 flex items-start gap-2 mt-1.5 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/70">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">
                          {issues.length > 0 ? issues[0] : "No direct WhatsApp conversion link"}
                        </span>
                        {pitch && (
                          <span className="text-slate-600 block mt-0.5">
                            Recommended: <span className="font-semibold text-emerald-800">{pitch.recommendedService}</span> ({pitch.pricePoint || "₹8,999"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Score Badge */}
                  <div className="flex items-center gap-3.5 shrink-0">
                    <div
                      className={`px-3.5 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[76px] shadow-2xs ${getScoreBadgeColor(
                        lead.leadScore
                      )}`}
                    >
                      <span className="text-xl font-black leading-tight tracking-tight">
                        {lead.leadScore || "N/A"}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider">Score</span>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenWhatsApp(lead)}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Open WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveTab("pitch");
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-300 shadow-2xs transition-colors"
                      >
                        <span>Audit & Pitch</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      </main>

      {/* Slide-over Modal for Lead Detail, Audit & Pitch Review */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedLead.name}</h2>
                  {getStatusBadge(selectedLead.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedLead.category} • {selectedLead.area}, {selectedLead.city} • Phone:{" "}
                  <span className="font-semibold text-slate-700">{selectedLead.phone || "N/A"}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-5 bg-white text-xs">
              <button
                onClick={() => setActiveTab("pitch")}
                className={`py-3 px-3.5 border-b-2 font-bold transition-colors ${
                  activeTab === "pitch"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Sales Pitch & WhatsApp
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`py-3 px-3.5 border-b-2 font-bold transition-colors ${
                  activeTab === "audit"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Website Audit
              </button>
              <button
                onClick={() => setActiveTab("score")}
                className={`py-3 px-3.5 border-b-2 font-bold transition-colors ${
                  activeTab === "score"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Score ({selectedLead.leadScore}/100)
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-3 px-3.5 border-b-2 font-bold transition-colors ${
                  activeTab === "history"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                History ({selectedLead.interactions?.length || 0})
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* TAB 1: PITCH & WHATSAPP */}
              {activeTab === "pitch" && (
                <div className="space-y-4">
                  {selectedLead.pitches[0] ? (
                    <>
                      {/* Offer Summary Card */}
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                            Recommended Offer
                          </span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-300 shadow-2xs">
                            {selectedLead.pitches[0].pricePoint || "₹4,999"} • 48-Hour Delivery
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {selectedLead.pitches[0].recommendedService}
                        </div>
                        <div className="text-xs text-slate-600">
                          {selectedLead.pitches[0].suggestedOffer}
                        </div>
                      </div>

                      {/* Work Demo Link Banner (if present) */}
                      {selectedLead.pitches[0].demoUrl && (
                        <div className="flex items-center justify-between p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs">
                          <div className="flex items-center gap-2 text-blue-900 font-semibold">
                            <Globe className="w-4 h-4 text-blue-600" />
                            <span>Live Work Demo Included</span>
                          </div>
                          <a
                            href={selectedLead.pitches[0].demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-white border border-blue-300 text-blue-700 font-bold rounded-lg hover:bg-blue-100 flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <span>Open Demo</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {/* Opening Message Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-700">
                              Personalized Message
                            </label>
                            {/* Language Switcher */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setPitchLanguage("hinglish")}
                                className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                                  pitchLanguage === "hinglish"
                                    ? "bg-white text-emerald-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                🇮🇳 Hinglish
                              </button>
                              <button
                                type="button"
                                onClick={() => setPitchLanguage("english")}
                                className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                                  pitchLanguage === "english"
                                    ? "bg-white text-emerald-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                🇬🇧 English
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const text =
                                pitchLanguage === "hinglish" &&
                                selectedLead.pitches[0].openingMessageHinglish
                                  ? selectedLead.pitches[0].openingMessageHinglish
                                  : selectedLead.pitches[0].openingMessage;
                              handleCopyPitch(text, selectedLead.pitches[0].id);
                            }}
                            className="text-xs text-slate-600 hover:text-emerald-700 flex items-center gap-1 font-semibold transition-colors"
                          >
                            {copiedPitchId === selectedLead.pitches[0].id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-2xs">
                          {pitchLanguage === "hinglish" &&
                          selectedLead.pitches[0].openingMessageHinglish
                            ? selectedLead.pitches[0].openingMessageHinglish
                            : selectedLead.pitches[0].openingMessage}
                        </div>

                        {/* Send Button */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              const text =
                                pitchLanguage === "hinglish" &&
                                selectedLead.pitches[0].openingMessageHinglish
                                  ? selectedLead.pitches[0].openingMessageHinglish
                                  : selectedLead.pitches[0].openingMessage;
                              handleOpenWhatsApp(selectedLead, text);
                            }}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Open in WhatsApp ({pitchLanguage === "hinglish" ? "Hinglish" : "English"})</span>
                          </button>
                        </div>
                      </div>

                      {/* Follow-up Message */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-700">
                          Day 3 Polite Follow-Up (If no reply)
                        </label>
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap">
                          {selectedLead.pitches[0].followUpMessage}
                        </div>
                      </div>

                      {/* Objection Handling Cheat Sheet */}
                      {selectedLead.pitches[0].likelyObjections && (
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold text-amber-900 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Founder Objection Cheat Sheet
                          </label>
                          <div className="space-y-2">
                            {JSON.parse(selectedLead.pitches[0].likelyObjections).map(
                              (item: { objection: string; response: string }, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-1"
                                >
                                  <div className="font-bold text-amber-900">
                                    Q: &ldquo;{item.objection}&rdquo;
                                  </div>
                                  <div className="text-slate-700 pl-3 border-l-2 border-emerald-600">
                                    {item.response}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No pitch generated yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: AUDIT DETAILS */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  {selectedLead.audit ? (
                    <>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                        <div className="text-xs font-bold text-slate-800">Executive Summary</div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {selectedLead.audit.auditSummary}
                        </p>
                      </div>

                      {/* Technical Check Grid */}
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px] font-medium">Website Status</span>
                          <span className="font-bold text-slate-900">
                            {selectedLead.audit.hasWebsite
                              ? selectedLead.audit.isAccessible
                                ? `Active (HTTP ${selectedLead.audit.statusCode})`
                                : `Broken / Error`
                              : "No Website"}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px] font-medium">Server Response Time</span>
                          <span className="font-bold text-slate-900">
                            {selectedLead.audit.loadTimeMs ? `${selectedLead.audit.loadTimeMs} ms` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px] font-medium">Mobile Viewport</span>
                          <span
                            className={`font-bold ${
                              selectedLead.audit.isMobileResponsive ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {selectedLead.audit.isMobileResponsive ? "Configured ✓" : "Missing ✗"}
                          </span>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px] font-medium">WhatsApp Conversion</span>
                          <span
                            className={`font-bold ${
                              selectedLead.audit.hasWhatsAppWidget ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {selectedLead.audit.hasWhatsAppWidget ? "Present ✓" : "Missing ✗"}
                          </span>
                        </div>
                      </div>

                      {/* Verified Issues */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-800">Verified Issues</div>
                        <div className="space-y-1.5">
                          {JSON.parse(selectedLead.audit.identifiedIssues || "[]").map(
                            (issue: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-900 font-medium"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>{issue}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Opportunities */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-slate-800">Growth Opportunities</div>
                        <div className="space-y-1.5">
                          {JSON.parse(selectedLead.audit.opportunities || "[]").map(
                            (opp: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{opp}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">No audit data available.</div>
                  )}
                </div>
              )}

              {/* TAB 3: SCORE BREAKDOWN */}
              {activeTab === "score" && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Total Score Calculation</span>
                      <span className="text-xl font-black text-emerald-700">
                        {selectedLead.leadScore || 0} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{selectedLead.scoreReason}</p>
                  </div>

                  {selectedLead.scoreBreakdown && (
                    <div className="space-y-2">
                      {(() => {
                        const breakdown = JSON.parse(selectedLead.scoreBreakdown);
                        return (
                          <>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                              <span className="text-slate-600 font-medium">Need & Identified Deficiencies</span>
                              <span className="font-bold text-slate-900">{breakdown.needScore} / 40 pts</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                              <span className="text-slate-600 font-medium">Business Activity & Customer Rating</span>
                              <span className="font-bold text-slate-900">{breakdown.activityScore} / 30 pts</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                              <span className="text-slate-600 font-medium">Service Match (WhatsApp Menu / Booking)</span>
                              <span className="font-bold text-slate-900">{breakdown.serviceMatchScore} / 20 pts</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs">
                              <span className="text-slate-600 font-medium">Contactability (WhatsApp/Phone Verified)</span>
                              <span className="font-bold text-slate-900">{breakdown.contactabilityScore} / 10 pts</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HISTORY & NOTES */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800">Add Log Note / Next Action</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Spoke to owner on WhatsApp, requested live demo on Zoom..."
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAddNote(selectedLead.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-lg text-white transition-colors"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-700">Interaction Timeline</div>
                    {selectedLead.interactions && selectedLead.interactions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLead.interactions.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-bold text-emerald-700">{item.type}</span>
                              <span>{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="text-slate-800">{item.content}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No activity recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Pipeline Transition Bar */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Update Lead Pipeline Stage
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "CONTACTED")}
                    className="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-colors"
                  >
                    Mark Contacted
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "REPLIED_INTERESTED")}
                    className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors"
                  >
                    Interested 🔥
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "MEETING_SCHEDULED")}
                    className="py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-colors"
                  >
                    Meeting Booked
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "WON")}
                    className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    Won Client 🎉
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Discovery & Harvest Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Harvest 30–40 Daily Business Leads</h3>
                  <p className="text-xs text-slate-500">Discover schools, hospitals, cafes, bakeries, small businesses & agencies</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setDiscoveryMode("free")}
                className={`py-2 px-3.5 border-b-2 font-bold transition-colors ${
                  discoveryMode === "free"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                ⚡ 100% Free Live Auto-Discovery (Zero Cost)
              </button>
              <button
                type="button"
                onClick={() => setDiscoveryMode("google")}
                className={`py-2 px-3.5 border-b-2 font-semibold transition-colors ${
                  discoveryMode === "google"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Google Places API (Optional)
              </button>
            </div>

            {discoveryMode === "free" ? (
              <form onSubmit={handleRunFreeDiscovery} className="space-y-3.5 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                  <strong>100% Free Lead Engine:</strong> Fetches verified businesses with real addresses & phone numbers using OpenStreetMap. Automatically audits websites and crafts personalized Hinglish & English pitches ready for your daily outreach.
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target City / Town</label>
                  <input
                    type="text"
                    value={freeDiscoveryCity}
                    onChange={(e) => setFreeDiscoveryCity(e.target.value)}
                    placeholder="e.g. Zirakpur, Chandigarh, Panchkula, Delhi, Mumbai, Lucknow"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {/* Quick City Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Zirakpur", "Dhakoli", "Panchkula", "Chandigarh", "Mohali", "Delhi", "Noida", "Gurgaon", "Mumbai", "Pune", "Bangalore", "Jaipur"].map((city) => (
                      <button
                        type="button"
                        key={city}
                        onClick={() => setFreeDiscoveryCity(city)}
                        className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                          freeDiscoveryCity.toLowerCase() === city.toLowerCase()
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Business Niche</label>
                    <select
                      value={freeDiscoveryCategory}
                      onChange={(e) => setFreeDiscoveryCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Mixed (Schools, Hospitals, Cafes, Bakeries, Small Biz, Agencies)</option>
                      <option value="schools">Schools, Colleges & Institutes</option>
                      <option value="hospitals">Hospitals, Clinics & Doctors</option>
                      <option value="cafes">Cafes & Restaurants</option>
                      <option value="bakeries">Bakeries & Confectioneries</option>
                      <option value="small_businesses">Small Businesses & Retail Shops</option>
                      <option value="agencies">Agencies & Consultancies</option>
                      <option value="salons">Salons & Spas</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Daily Target Count</label>
                    <select
                      value={freeDiscoveryCount}
                      onChange={(e) => setFreeDiscoveryCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value={30}>30 Fresh Leads (Recommended Daily)</option>
                      <option value={35}>35 Fresh Leads</option>
                      <option value={40}>40 Fresh Leads (Aggressive Sprint)</option>
                      <option value={50}>50 Fresh Leads</option>
                    </select>
                  </div>
                </div>

                {discoveryMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium ${
                      discoveryMessage.startsWith("Success")
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {discoveryMessage}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscoveryModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={discoveryLoading}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {discoveryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Harvesting & Auditing {freeDiscoveryCount} Leads...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Harvest & Prepare {freeDiscoveryCount} Leads for Today</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRunDiscovery} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Search Query</label>
                  <input
                    type="text"
                    value={discoveryQuery}
                    onChange={(e) => setDiscoveryQuery(e.target.value)}
                    placeholder="e.g. cafes in Zirakpur VIP Road, schools in Panchkula"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target City</label>
                    <select
                      value={discoveryCity}
                      onChange={(e) => setDiscoveryCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Zirakpur">Zirakpur</option>
                      <option value="Dhakoli">Dhakoli</option>
                      <option value="Panchkula">Panchkula</option>
                      <option value="Chandigarh">Chandigarh</option>
                      <option value="Mohali">Mohali</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Niche Category</label>
                    <select
                      value={discoveryNiche}
                      onChange={(e) => setDiscoveryNiche(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Food & Beverage">Food & Beverage (Café/Diner)</option>
                      <option value="Beauty & Wellness">Beauty & Wellness (Salon/Spa)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Google Places API Key <span className="text-slate-400 font-normal">(Optional if set in .env)</span>
                  </label>
                  <input
                    type="password"
                    value={discoveryApiKey}
                    onChange={(e) => setDiscoveryApiKey(e.target.value)}
                    placeholder="Paste AIzaSy... or leave empty to use GOOGLE_API_KEY from .env"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {discoveryMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium ${
                      discoveryMessage.startsWith("Success")
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {discoveryMessage}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscoveryModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={discoveryLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {discoveryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing & Auditing...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        <span>Discover & Audit Leads</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Daily 30-40 Outreach Sprint Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {sprintIndex >= sprintLeads.length ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  🎉
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Daily Outreach Sprint Completed!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  You have reviewed and contacted all queued leads for today. Great job keeping your pipeline active!
                </p>
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => setShowSprintModal(false)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (() => {
              const lead = sprintLeads[sprintIndex];
              const pitch = lead.pitches[0];
              const messageText =
                sprintLanguage === "hinglish" && pitch?.openingMessageHinglish
                  ? pitch.openingMessageHinglish
                  : pitch?.openingMessage || "";

              return (
                <>
                  {/* Sprint Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Lead {sprintIndex + 1} of {sprintLeads.length}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({Math.round(((sprintIndex) / sprintLeads.length) * 100)}% complete)
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{lead.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{lead.category}</span> • <span>{lead.city}</span> •{" "}
                        <span className="font-mono text-slate-700 font-medium">{lead.phone || lead.whatsappPhone}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setShowSprintModal(false)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-slate-100 h-1.5">
                    <div
                      className="bg-emerald-600 h-1.5 transition-all duration-300"
                      style={{
                        width: `${((sprintIndex + 1) / sprintLeads.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Content Area */}
                  <div className="p-6 overflow-y-auto space-y-4 text-xs">
                    {/* Controls & Demo */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setSprintLanguage("hinglish")}
                          className={`px-3 py-1 rounded-md font-bold transition-colors ${
                            sprintLanguage === "hinglish"
                              ? "bg-white text-emerald-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          🇮🇳 Hinglish
                        </button>
                        <button
                          type="button"
                          onClick={() => setSprintLanguage("english")}
                          className={`px-3 py-1 rounded-md font-bold transition-colors ${
                            sprintLanguage === "english"
                              ? "bg-white text-emerald-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          🇬🇧 English
                        </button>
                      </div>

                      {pitch?.demoUrl && (
                        <a
                          href={pitch.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Included Demo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Message Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700">Outreach Message Preview</label>
                        <span className="text-[11px] text-slate-400">
                          {messageText.split(/\s+/).filter(Boolean).length} words • 48h turnaround • Feasible offer
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-2xs">
                        {messageText}
                      </div>
                    </div>
                  </div>

                  {/* Sprint Footer Buttons */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
                    <button
                      onClick={() => setSprintIndex((prev) => Math.max(0, prev - 1))}
                      disabled={sprintIndex === 0}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-white disabled:opacity-30"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSprintIndex((prev) => prev + 1)}
                        className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-white"
                      >
                        Skip
                      </button>

                      <button
                        onClick={() => {
                          handleOpenWhatsApp(lead, messageText);
                          setSprintIndex((prev) => prev + 1);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:scale-[1.02] transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-current" />
                        <span>Open WhatsApp & Next →</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Quick Add Business Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Quick Add Local Business</h3>
                  <p className="text-xs text-slate-500">Instantly add any local prospect to audit and draft outreach</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Business Name *</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Blue Tokai Coffee Roasters"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newLeadCategory}
                    onChange={(e) => setNewLeadCategory(e.target.value)}
                    placeholder="Café, Bakery, Salon"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Niche</label>
                  <select
                    value={newLeadNiche}
                    onChange={(e) => setNewLeadNiche(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Beauty & Wellness">Beauty & Wellness</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City</label>
                  <select
                    value={newLeadCity}
                    onChange={(e) => setNewLeadCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Zirakpur">Zirakpur</option>
                    <option value="Dhakoli">Dhakoli</option>
                    <option value="Panchkula">Panchkula</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Mohali">Mohali</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Area / Sector</label>
                  <input
                    type="text"
                    value={newLeadArea}
                    onChange={(e) => setNewLeadArea(e.target.value)}
                    placeholder="e.g. VIP Road, Sec 9"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    placeholder="e.g. +91 98888 12345"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Website URL (Optional)</label>
                  <input
                    type="text"
                    value={newLeadWebsite}
                    onChange={(e) => setNewLeadWebsite(e.target.value)}
                    placeholder="e.g. https://example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {quickAddError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium">
                  {quickAddError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickAddLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                >
                  {quickAddLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auditing & Adding...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add & Run Audit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
