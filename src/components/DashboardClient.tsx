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
} from "lucide-react";
import { updateLeadStatus, markWhatsAppOpened, reAuditLead, addInteraction } from "@/app/actions";

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
    followUpMessage: string;
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

  const handleOpenWhatsApp = (lead: LeadWithRelations) => {
    const pitch = lead.pitches[0];
    if (!pitch || !lead.whatsappPhone) return;

    const encodedText = encodeURIComponent(pitch.openingMessage);
    const waUrl = `https://wa.me/${lead.whatsappPhone}?text=${encodedText}`;

    // Open WhatsApp in new tab / app
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Mark as contacted in database
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

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return "bg-slate-800 text-slate-400 border-slate-700";
    if (score >= 85) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (score >= 70) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-slate-700/30 text-slate-300 border-slate-600/30";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OUTREACH_READY":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Ready</span>;
      case "CONTACTED":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Contacted</span>;
      case "REPLIED_INTERESTED":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">Interested 🔥</span>;
      case "MEETING_SCHEDULED":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Meeting</span>;
      case "WON":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500 text-slate-950 font-bold">Client Won 🎉</span>;
      case "OPTED_OUT":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">Opted Out</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20">
              CB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white text-base">CodeBerry Technologies</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Sprint Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">Target: 1–2 Clients by October 31, 2026 • Dhakoli, Zirakpur & Panchkula</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Campaign Timeline</div>
              <div className="text-xs font-semibold text-emerald-400">Oct 19 → Oct 31 (12 Days)</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Total Leads</span>
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-white">{stats.totalLeads}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">20 F&B • 6 Salons</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>High Priority (80+)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-400">{stats.highPriority}</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">Prime candidates</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Outreach Ready</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-blue-400">{stats.outreachReady}</div>
            <div className="text-[11px] text-blue-500/80 mt-0.5">Audited & drafted</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Contacted</span>
              <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-purple-400">{stats.contacted}</div>
            <div className="text-[11px] text-purple-500/80 mt-0.5">WhatsApp opened</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
              <span>Interested / Calls</span>
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-amber-400">{stats.interested + stats.meetings}</div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">Qualified pipeline</div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 shadow-sm">
            <div className="text-xs font-medium text-emerald-300 flex items-center justify-between">
              <span>Paying Clients</span>
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-400">{stats.won} / 2</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">Target: ₹15k–₹25k</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search business, area, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              {/* Category */}
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Niches</option>
                <option value="Food & Beverage">Food & Beverage (Cafés/Restaurants)</option>
                <option value="Beauty & Wellness">Beauty & Wellness (Salons/Spas)</option>
              </select>

              {/* City */}
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Cities</option>
                <option value="Zirakpur">Zirakpur</option>
                <option value="Panchkula">Panchkula</option>
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OUTREACH_READY">Outreach Ready</option>
                <option value="CONTACTED">Contacted</option>
                <option value="REPLIED_INTERESTED">Interested</option>
                <option value="MEETING_SCHEDULED">Meeting</option>
                <option value="WON">Won</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lead Table / Cards */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredLeads.length} qualified prospects</span>
            <span className="hidden sm:inline">Ranked by Lead Score & Verified Needs</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {filteredLeads.map((lead) => {
              const audit = lead.audit;
              const pitch = lead.pitches[0];
              const issues: string[] = audit ? JSON.parse(audit.identifiedIssues || "[]") : [];

              return (
                <div
                  key={lead.id}
                  className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Business Info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white text-base hover:text-emerald-400 transition-colors">
                        {lead.name}
                      </h3>
                      {getStatusBadge(lead.status)}
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        {lead.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {lead.area ? `${lead.area}, ${lead.city}` : lead.city}
                      </span>
                      {lead.rating && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {lead.rating} ({lead.reviewCount || 0} reviews)
                        </span>
                      )}
                      <span>
                        {lead.websiteUrl ? (
                          <a
                            href={lead.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {lead.websiteUrl.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">No Website Found</span>
                        )}
                      </span>
                    </div>

                    {/* Verified Issue / Opportunity Tag */}
                    <div className="text-xs text-slate-300 flex items-start gap-1.5 mt-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-slate-200">
                          {issues.length > 0 ? issues[0] : "No direct WhatsApp conversion link"}
                        </span>
                        {pitch && (
                          <span className="text-slate-400 block mt-0.5">
                            Offer: <span className="text-emerald-400">{pitch.recommendedService}</span> ({pitch.pricePoint || "₹8,999"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Score Indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className={`px-3 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[70px] ${getScoreBadgeColor(
                        lead.leadScore
                      )}`}
                    >
                      <span className="text-lg font-bold leading-tight">{lead.leadScore || "N/A"}</span>
                      <span className="text-[10px] uppercase font-semibold tracking-wider">Score</span>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenWhatsApp(lead)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Open WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveTab("pitch");
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                      >
                        <span>Audit & Pitch</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Slide-over / Modal for Lead Detail, Audit & Pitch Review */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{selectedLead.name}</h2>
                  {getStatusBadge(selectedLead.status)}
                </div>
                <p className="text-xs text-slate-400">
                  {selectedLead.category} • {selectedLead.area}, {selectedLead.city} • Phone: {selectedLead.phone || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 px-4 bg-slate-950/40 text-xs">
              <button
                onClick={() => setActiveTab("pitch")}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === "pitch"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Sales Pitch & WhatsApp
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === "audit"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Website & Business Audit
              </button>
              <button
                onClick={() => setActiveTab("score")}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === "score"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Score Breakdown ({selectedLead.leadScore}/100)
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === "history"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                History ({selectedLead.interactions?.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* TAB 1: PITCH & WHATSAPP */}
              {activeTab === "pitch" && (
                <div className="space-y-4">
                  {selectedLead.pitches[0] ? (
                    <>
                      {/* Offer Summary Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            Recommended Offer
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {selectedLead.pitches[0].pricePoint || "₹8,999"} • 48-Hour Delivery
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {selectedLead.pitches[0].recommendedService}
                        </div>
                        <div className="text-xs text-slate-400">
                          {selectedLead.pitches[0].suggestedOffer}
                        </div>
                      </div>

                      {/* Opening Message Box */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-300">
                            Personalized WhatsApp Opening Message
                          </label>
                          <button
                            onClick={() =>
                              handleCopyPitch(
                                selectedLead.pitches[0].openingMessage,
                                selectedLead.pitches[0].id
                              )
                            }
                            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                          >
                            {copiedPitchId === selectedLead.pitches[0].id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                          {selectedLead.pitches[0].openingMessage}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleOpenWhatsApp(selectedLead)}
                            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>Open in WhatsApp (Send Outreach)</span>
                          </button>
                        </div>
                      </div>

                      {/* Follow-up Message */}
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-semibold text-slate-400">
                          Day 3 Polite Follow-Up (If no reply)
                        </label>
                        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs text-slate-300 whitespace-pre-wrap">
                          {selectedLead.pitches[0].followUpMessage}
                        </div>
                      </div>

                      {/* Objection Handling Cheat Sheet */}
                      {selectedLead.pitches[0].likelyObjections && (
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            Founder Objection Cheat Sheet
                          </label>
                          <div className="space-y-2">
                            {JSON.parse(selectedLead.pitches[0].likelyObjections).map(
                              (item: { objection: string; response: string }, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg text-xs space-y-1"
                                >
                                  <div className="font-medium text-amber-300">
                                    Q: &ldquo;{item.objection}&rdquo;
                                  </div>
                                  <div className="text-slate-300 pl-3 border-l-2 border-emerald-500/40">
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
                    <div className="text-center py-8 text-slate-500 text-xs">
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
                      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="text-xs font-semibold text-slate-300">Audit Executive Summary</div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedLead.audit.auditSummary}
                        </p>
                      </div>

                      {/* Technical Check Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Website Status</span>
                          <span className="font-semibold text-white">
                            {selectedLead.audit.hasWebsite
                              ? selectedLead.audit.isAccessible
                                ? `Active (HTTP ${selectedLead.audit.statusCode})`
                                : `Broken / Inaccessible`
                              : "No Website"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Server Response Time</span>
                          <span className="font-semibold text-white">
                            {selectedLead.audit.loadTimeMs ? `${selectedLead.audit.loadTimeMs} ms` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Mobile Optimized Viewport</span>
                          <span
                            className={`font-semibold ${
                              selectedLead.audit.isMobileResponsive ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {selectedLead.audit.isMobileResponsive ? "Configured ✓" : "Missing ✗"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Direct WhatsApp Action</span>
                          <span
                            className={`font-semibold ${
                              selectedLead.audit.hasWhatsAppWidget ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {selectedLead.audit.hasWhatsAppWidget ? "Present ✓" : "Missing ✗"}
                          </span>
                        </div>
                      </div>

                      {/* Identified Issues */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-300">Verified Issues</div>
                        <div className="space-y-1">
                          {JSON.parse(selectedLead.audit.identifiedIssues || "[]").map(
                            (issue: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{issue}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Opportunities */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-300">Revenue Opportunities</div>
                        <div className="space-y-1">
                          {JSON.parse(selectedLead.audit.opportunities || "[]").map(
                            (opp: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs text-emerald-300"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{opp}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">No audit data available.</div>
                  )}
                </div>
              )}

              {/* TAB 3: SCORE BREAKDOWN */}
              {activeTab === "score" && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Lead Score Calculation</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {selectedLead.leadScore || 0} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{selectedLead.scoreReason}</p>
                  </div>

                  {selectedLead.scoreBreakdown && (
                    <div className="space-y-2">
                      {(() => {
                        const breakdown = JSON.parse(selectedLead.scoreBreakdown);
                        return (
                          <>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-slate-400">Need & Identified Deficiencies</span>
                              <span className="font-bold text-white">{breakdown.needScore} / 40 pts</span>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-slate-400">Business Activity & Customer Rating</span>
                              <span className="font-bold text-white">{breakdown.activityScore} / 30 pts</span>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-slate-400">Service Match (WhatsApp Menu / Booking)</span>
                              <span className="font-bold text-white">{breakdown.serviceMatchScore} / 20 pts</span>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-slate-400">Contactability (WhatsApp/Phone Verified)</span>
                              <span className="font-bold text-white">{breakdown.contactabilityScore} / 10 pts</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: INTERACTION HISTORY & QUICK NOTES */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Add Log Note / Next Action</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Owner called back, wants to see demo on Friday 4 PM..."
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAddNote(selectedLead.id)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-slate-400">Interaction Timeline</div>
                    {selectedLead.interactions && selectedLead.interactions.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLead.interactions.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-medium text-emerald-400">{item.type}</span>
                              <span>{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="text-slate-300">{item.content}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-600 text-xs">
                        No activity recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Pipeline Transition Bar */}
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Update Lead Pipeline Stage
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "CONTACTED")}
                    className="py-1.5 px-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-colors"
                  >
                    Mark Contacted
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "REPLIED_INTERESTED")}
                    className="py-1.5 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
                  >
                    Interested 🔥
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "MEETING_SCHEDULED")}
                    className="py-1.5 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors"
                  >
                    Meeting Booked
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedLead.id, "WON")}
                    className="py-1.5 px-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
                  >
                    Won Client 🎉
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
