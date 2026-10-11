"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Star, Calendar, MapPin, Briefcase, Award, MessageSquare, ExternalLink, ShieldCheck } from "lucide-react";
import { getPublicUserProfile } from "@/lib/services/user.service";
import { Link } from "@/i18n/routing";

interface PublicProfileModalProps {
  userId: string | number | null;
  fallbackName?: string;
  fallbackAvatar?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicProfileModal({
  userId,
  fallbackName = "S Tech Customer",
  fallbackAvatar = null,
  isOpen,
  onClose,
}: PublicProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      getPublicUserProfile(userId)
        .then((res) => {
          setProfile(res);
        })
        .catch((err) => {
          console.error("Failed to load public profile:", err);
          setProfile({
            display_name: fallbackName,
            photo_url: fallbackAvatar,
            profession: "Tech Enthusiast",
            city: "Phnom Penh, Cambodia",
            member_since: "2026",
            verified_buyer: true,
            total_reviews: 1,
            reviews: [],
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!isOpen) {
      setProfile(null);
    }
  }, [isOpen, userId, fallbackName, fallbackAvatar]);

  if (!isOpen) return null;

  const displayName = profile?.display_name || fallbackName;
  const photoUrl = profile?.photo_url || fallbackAvatar;
  const initial = (displayName[0] || "U").toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="w-full max-w-lg bg-white dark:bg-[#151922] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Cover Header Banner */}
          <div className="relative h-28 sm:h-32 bg-gradient-to-r from-red-900 via-[#8B1A1A] to-stone-900 p-4 flex justify-between items-start">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[11px] font-bold border border-white/10">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Public Customer Profile</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer border border-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Profile Card Body */}
          <div className="px-5 sm:px-6 pb-6 pt-0 flex-1 overflow-y-auto no-scrollbar space-y-5">
            {/* Avatar & Main Identity */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 -mt-12 sm:-mt-14 mb-2">
              <div className="relative">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-4 border-white dark:border-[#151922] shadow-xl bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#8B1A1A] to-amber-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center border-4 border-white dark:border-[#151922] shadow-xl">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-[#151922] shadow" title="Verified Customer">
                  <CheckCircle2 size={13} />
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <Award size={13} /> Verified Tech Buyer
                </span>
              </div>
            </div>

            {/* Name & Bio Info */}
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{displayName}</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {profile?.profession || "Tech Enthusiast"}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400" />
                  <span>{profile?.city || "Phnom Penh, Cambodia"}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400" />
                  <span>Member since {profile?.member_since || "2026"}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
              <div>
                <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {profile?.total_reviews ?? 1}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Reviews</div>
              </div>
              <div className="border-x border-gray-200 dark:border-white/10">
                <div className="text-base sm:text-lg font-black text-amber-500 flex items-center justify-center gap-0.5">
                  <Star size={14} fill="currentColor" />
                  <span>5.0</span>
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Rating Given</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Verified</div>
              </div>
            </div>

            {/* Reviews by this user */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-400 flex items-center gap-1.5">
                  <MessageSquare size={13} /> Reviews by {displayName}
                </h3>
              </div>

              {loading ? (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading public reviews...</span>
                </div>
              ) : profile?.reviews && profile.reviews.length > 0 ? (
                <div className="space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
                  {profile.reviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1.5"
                    >
                      {rev.product && (
                        <Link
                          href={`/products/${rev.product.slug}`}
                          onClick={onClose}
                          className="flex items-center justify-between gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-[#8B1A1A] transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {rev.product.image && (
                              <img
                                src={rev.product.image}
                                alt={rev.product.name}
                                className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-[#12151e] p-0.5 border border-gray-100 dark:border-white/10"
                              />
                            )}
                            <span className="truncate">{rev.product.name}</span>
                          </div>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                      )}
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                        <span className="text-[10px] text-gray-400 ml-1">
                          {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 border border-gray-100 dark:border-white/5">
                  Verified buyer on S Tech Store.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
