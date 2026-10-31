export interface SellerSummary { id: string; displayName: string; avatarMediaId?: string }

export interface RentTerms { unit: string; pricePerUnit: number; deposit: number; minUnits: number }

export interface ListingCard {
  id: string; type: "Sell" | "Buy" | "Rent" | "Give"; title: string; price?: number | null; priceMode: string;
  priceRefMin?: number | null; priceRefMax?: number | null; budgetMin?: number | null; budgetMax?: number | null; rent?: RentTerms | null;
  categoryId: string; speciesId?: string | null; provinceId: string; wardId?: string | null; thumbUrl?: string | null; photoCount: number;
  realPhoto: boolean; bumpedAt?: string | null; status: string;
  available: number; unit: string; distanceKm?: number | null; seller: SellerSummary;
}

export interface SearchResult { items: ListingCard[]; total: number; page: number; pageSize: number }

export interface ListingDetail {
  card: ListingCard; description: string; attributes: Record<string, unknown>; photoUrls: string[]; verificationPhotoUrl?: string | null;
  pickupOptions: string[]; wantInExchange?: string | null; neededBy?: string | null; quantity: number; views: number;
  firstPublishedAt?: string | null; expiresAt?: string | null; isOwner: boolean; rejectReason?: string | null;
  pendingRevision?: unknown; revisionRejectReason?: string | null; appealUsed: boolean;
  lat?: number | null; lng?: number | null; uses?: string[];
  /** Số ngày hiển thị theo gói lúc đăng (Miễn phí 30, Plus/Pro 60). */
  listingDays?: number;
}

export interface AttributeDefinition {
  key: string; label: string; type: "Text" | "Number" | "SingleSelect" | "MultiSelect" | "Boolean"; unit?: string | null;
  options: string[]; required: boolean; filterable: boolean; min?: number | null; max?: number | null;
}
export interface Category {
  id: string; parentId?: string | null; name: string; level: number; isLivePlant: boolean; allowNegotiablePrice: boolean;
  requiresManualReview: boolean; attributes: AttributeDefinition[];
}
export interface CategoryTree { id: string; name: string; children: { id: string; name: string; isLivePlant: boolean; allowNegotiablePrice: boolean }[] }
export interface Species { id: string; commonName: string; aliases: string[]; scientificName?: string; light?: string; difficulty?: number; petToxicity?: string; description?: string }

export interface Me {
  id: string; phone?: string | null; username?: string | null; displayName: string; fullName?: string | null; provinceId?: string | null; wardId?: string | null;
  hidePhone: boolean; status: string; canPost: boolean;
  /** Email nhận nhắc lịch chăm cây; chưa có thì không đặt được lời nhắc. */
  email?: string | null;
}

export interface PublicPricing {
  version: number;
  topUpPackages: { code: string; name: string; priceVnd: number; xu: number; bonusXu: number; popular: boolean }[];
}

export interface MediaDto { id: string; kind: string; width: number; height: number; urls: Record<string, string> }

export interface Article {
  id: string; slug: string; title: string; summary?: string | null; body?: string | null; speciesId?: string | null; tags: string[];
  status: string; publishAt?: string | null; views: number; cover?: MediaDto | null; photos?: MediaDto[] | null;
}

export type ReminderKind = "Watering" | "Fertilizing" | "Pruning" | "Repotting" | "Other";
export type ReminderRepeat = "None" | "Daily" | "Weekly" | "Monthly" | "Yearly";
export interface CareReminder {
  id: string; plantId: string; kind: ReminderKind; note?: string | null; anchorAt: string; repeat: ReminderRepeat; interval: number;
  nextAt?: string | null; lastFiredAt?: string | null; enabled: boolean;
}
export interface MyPlant {
  id: string; name: string; speciesId?: string | null; speciesName?: string | null; location?: string | null; acquiredAt?: string | null;
  note?: string | null; createdAt: string; reminders: CareReminder[];
  /** Ảnh minh họa loài trong danh mục. Ảnh cây thật chỉ lưu trên điện thoại (app Chạm Xanh), máy chủ không giữ. */
  speciesImageUrl?: string | null;
  /** Luôn rỗng (giữ để tương thích). */
  photos: MediaDto[];
  /** Vượt số cây của gói hiện tại (gói đã hết hạn): xem/xóa được, không sửa, nhắc lịch tạm dừng. */
  locked: boolean;
}

export interface AppNotification { id: string; type: string; title: string; body?: string | null; link?: string | null; readAt?: string | null; createdAt: string }

export interface CommunityAuthor {
  id: string; name: string; avatarMediaId?: string | null; points: number; badge: string; expert: boolean; expertTitle?: string | null;
}
export type PostType = "Question" | "Showcase" | "Guide";
export interface PostSummary {
  id: string; type: PostType; title: string; excerpt: string; speciesIds: string[]; topics: string[]; likes: number; comments: number;
  answered: boolean; createdAt: string; lastActivityAt: string; thumbUrl?: string | null; author?: CommunityAuthor;
}

export type PlanCode = "Free" | "Plus" | "Pro";
export interface PlanInfo {
  code: PlanCode; name: string; tagline: string; monthlyVnd: number; yearlyVnd: number;
  gardenPlants: number; aiPerDay: number; marketCompare: boolean; sellerAi: boolean;
  /** Số tin đăng miễn phí mỗi tháng, Xu cho mỗi tin vượt mức, số ngày tin hiển thị. */
  listingsPerMonth: number; extraListingXu: number; listingDays: number;
}
/** Hạn mức đăng tin tháng này (GET /me/listing-quota). */
export interface ListingQuota {
  plan: PlanCode; planName: string; monthlyQuota: number; usedThisMonth: number; remaining: number; extraListingXu: number;
  nextCostXu: number; listingDays: number; walletBalance: number; month: string;
}
export interface MyPlan { plan: PlanInfo; endAt?: string | null; usage: { gardenPlants: number; aiToday: number; aiRemaining: number } }
export interface PlanPayment {
  id: string; plan: PlanCode; months: number; amountVnd: number; orderCode: number; gateway: string; checkoutUrl?: string | null;
  /** Chuỗi VietQR của PayOS để hiện mã QR ngay trên trang/app. */
  qrCode?: string | null;
  status: "Pending" | "Paid" | "Cancelled" | "Expired"; createdAt: string; expiresAt: string; paidAt?: string | null;
  appliedPlan?: PlanCode | null; appliedEndAt?: string | null;
}

export interface AiQuota { used: number; limit: number; remaining: number }
export interface AiConversation { id: string; title: string; createdAt: string; updatedAt: string; expireAt: string }
export interface AiMessage { id: string; role: "user" | "assistant"; text: string; offTopic: boolean; createdAt: string; photos: string[] }
export interface AiChatResult { conversation: AiConversation; question: AiMessage; reply: AiMessage; counted: boolean; quota: AiQuota }
export interface PriceStats { count: number; min: number; median: number; max: number }
export interface AiCompareResult {
  verdict: string; recommendedId?: string | null; tips: string[]; listings: ListingCard[]; quota: AiQuota;
  items: { listingId: string; highlights: string[]; concerns: string[]; valueScore?: number | null }[];
}
export interface AiMarketCheck {
  position: string; summary: string; suggestedMin: number; suggestedMax: number; suggestions: string[];
  myPrice?: number | null; stats?: PriceStats | null; similar: ListingCard[]; quota: AiQuota;
}
export interface AiPriceSuggestion {
  low: number; recommended: number; high: number; reasoning: string; confidence: string; stats?: PriceStats | null; similar: ListingCard[]; quota: AiQuota;
}
export interface AiListingDraft { title: string; description: string; missing: string[]; quota: AiQuota }
