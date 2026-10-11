import { getPublicUserProfile } from "@/lib/services/user.service";
import { Link } from "@/i18n/routing";
import { Star, MapPin, Calendar, CheckCircle2, Award, MessageSquare, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const profile = await getPublicUserProfile(id);
    return {
      title: `${profile?.display_name || "Customer Profile"} - S Tech Store`,
      description: `Public profile and verified tech reviews by ${profile?.display_name || "Customer"} on S Tech Store Cambodia.`,
    };
  } catch (e) {
    return {
      title: "Public Profile - S Tech Store",
    };
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;

  let profile: any = null;
  try {
    profile = await getPublicUserProfile(id);
  } catch (e) {
    profile = {
      display_name: "S Tech Customer",
      photo_url: null,
      profession: "Tech Enthusiast",
      city: "Phnom Penh, Cambodia",
      member_since: "2026",
      verified_buyer: true,
      total_reviews: 0,
      reviews: [],
    };
  }

  const displayName = profile?.display_name || "S Tech Customer";
  const photoUrl = profile?.photo_url;
  const initial = (displayName[0] || "U").toUpperCase();

  return (
    <div className="bg-[#f5f5f5] dark:bg-[#0b0e14] min-h-screen text-gray-900 dark:text-gray-100 py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Store
        </Link>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[#151922] rounded-3xl border border-gray-100 dark:border-white/10 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="relative h-36 sm:h-44 bg-gradient-to-r from-red-900 via-[#8B1A1A] to-zinc-900 p-6 flex items-start justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold border border-white/10">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Public Customer Profile</span>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            {/* Avatar & Badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
              <div className="relative">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-[#151922] shadow-2xl bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#8B1A1A] to-amber-500 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-4 border-white dark:border-[#151922] shadow-2xl">
                    {initial}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-[#151922] shadow">
                  <CheckCircle2 size={14} />
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <Award size={14} /> Verified Tech Buyer
              </span>
            </div>

            {/* Information */}
            <div className="space-y-3 mb-6">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">{displayName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.profession || "Tech Enthusiast"}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  <span>{profile?.city || "Phnom Penh, Cambodia"}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  <span>Member since {profile?.member_since || "2026"}</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center mb-8">
              <div>
                <div className="text-xl font-black text-gray-900 dark:text-white">{profile?.total_reviews ?? 1}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Reviews</div>
              </div>
              <div className="border-x border-gray-200 dark:border-white/10">
                <div className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                  <Star size={16} fill="currentColor" />
                  <span>5.0</span>
                </div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Rating</div>
              </div>
              <div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Verified</div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <MessageSquare size={14} /> Reviews Written ({profile?.reviews?.length || 0})
              </h2>

              {profile?.reviews && profile.reviews.length > 0 ? (
                <div className="space-y-3">
                  {profile.reviews.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2"
                    >
                      {rev.product && (
                        <Link
                          href={`/products/${rev.product.slug}`}
                          className="flex items-center justify-between gap-3 text-sm font-bold text-gray-900 dark:text-white hover:text-[#8B1A1A] transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {rev.product.image && (
                              <img
                                src={rev.product.image}
                                alt={rev.product.name}
                                className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-[#12151e] p-1 border border-gray-100 dark:border-white/10"
                              />
                            )}
                            <span className="truncate">{rev.product.name}</span>
                          </div>
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                      )}

                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} size={12} fill="currentColor" />
                        ))}
                        <span className="text-xs text-gray-400 ml-2">
                          {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-white/5 text-center text-sm text-gray-500 border border-gray-100 dark:border-white/5">
                  No public reviews posted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
