export interface SellerSummary { id: string; displayName: string; avatarMediaId?: string; isGarden: boolean; isVerifiedGarden: boolean; isProSeller: boolean }

export interface RentTerms { unit: string; pricePerUnit: number; deposit: number; minUnits: number }

export interface ListingCard {
  id: string; type: "Sell" | "Buy" | "Rent" | "Give"; title: string; price?: number | null; priceMode: string;
  priceRefMin?: number | null; priceRefMax?: number | null; budgetMin?: number | null; budgetMax?: number | null; rent?: RentTerms | null;
  categoryId: string; speciesId?: string | null; provinceId: string; wardId?: string | null; thumbUrl?: string | null; photoCount: number;
  realPhoto: boolean; escrow: boolean; isPriority: boolean; highlight?: string | null; bumpedAt?: string | null; status: string;
  available: number; unit: string; distanceKm?: number | null; seller: SellerSummary;
}

export interface SearchResult { priority: ListingCard[]; items: ListingCard[]; total: number; page: number; pageSize: number }

export interface ListingDetail {
  card: ListingCard; description: string; attributes: Record<string, unknown>; photoUrls: string[]; verificationPhotoUrl?: string | null;
  pickupOptions: string[]; wantInExchange?: string | null; neededBy?: string | null; quantity: number; views: number;
  firstPublishedAt?: string | null; expiresAt?: string | null; isOwner: boolean; rejectReason?: string | null;
  pendingRevision?: unknown; revisionRejectReason?: string | null; priorityUntil?: string | null; appealUsed: boolean;
  lat?: number | null; lng?: number | null;
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
  id: string; phone: string; displayName: string; fullName?: string | null; provinceId?: string | null; wardId?: string | null;
  hidePhone: boolean; flags: { isProSeller: boolean; hasVerifiedGarden: boolean; hasActivePlan: boolean }; status: string; canPost: boolean;
}

export interface PublicPricing {
  version: number;
  listingServices: { code: string; enabled: boolean; days?: number | null; perDay?: number | null; labelName?: string | null; prices: Record<string, number> }[];
  gardenPlans: { months: number; priceVnd: number; enabled: boolean }[];
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
  note?: string | null; createdAt: string; photos: MediaDto[]; reminders: CareReminder[];
}

export interface AppNotification { id: string; type: string; title: string; body?: string | null; link?: string | null; readAt?: string | null; createdAt: string }

export type OrderStatus = "AwaitingPayment" | "AwaitingSellerConfirm" | "Paid" | "Shipping" | "Delivered" | "Disputed" | "AwaitingReturn"
  | "Completed" | "PartiallyRefunded" | "Refunded" | "Settled" | "Cancelled" | "CancelledRefunded";
export type DeliveryMethod = "SellerDelivery" | "BuyerPickup" | "SelfArrangedCarrier" | "PlatformCarrier";
export interface ShipmentInfo { carrier?: string | null; trackingCode?: string | null; mediaIds: string[]; expectedArrival?: string | null }
export interface Dispute {
  reason: string; description: string; mediaIds: string[]; hasUnboxingVideo: boolean; openedAt: string; sellerDueAt: string;
  sellerResponse?: string | null; sellerOfferAmount?: number | null; sellerNote?: string | null; sellerRespondedAt?: string | null;
  outcome?: string | null; resolvedRefund?: number | null; resolutionNote?: string | null; resolvedAt?: string | null;
  return?: ShipmentInfo | null; returnShippedAt?: string | null;
}
export interface EscrowOrder {
  id: string; code: string; listingId: string; listingTitle: string; thumbMediaId?: string | null; buyerId: string; sellerId: string;
  source: string; quantity: number; unitPrice: number; itemAmount: number; shippingFee: number; total: number; fee: number; feePayer: string;
  delivery: DeliveryMethod; shipWithinDays: number; pickupDate?: string | null; deliveryAddress?: string | null; status: OrderStatus;
  paymentDueAt?: string | null; sellerConfirmDueAt?: string | null; shipDueAt?: string | null; paidAt?: string | null;
  shipment?: ShipmentInfo | null; shippedAt?: string | null; deliveredAt?: string | null; inspectionDueAt?: string | null;
  completedAt?: string | null; dispute?: Dispute | null; refundAmount: number; cancelReason?: string | null; settlementHold: boolean;
  payoutEligibleAt?: string | null; payoutAmount?: number | null; settledAt?: string | null; reviewed: boolean;
  history: { status: string; actorId: string; note?: string | null; at: string }[]; createdAt: string; updatedAt: string;
}
export interface OrderSummary {
  id: string; code: string; listingId: string; listingTitle: string; thumbUrl?: string | null; role: "buyer" | "seller";
  status: OrderStatus; total: number; quantity: number; delivery: DeliveryMethod; createdAt: string; updatedAt: string;
}

export interface CommunityAuthor {
  id: string; name: string; avatarMediaId?: string | null; points: number; badge: string; expert: boolean; expertTitle?: string | null;
  gardenSlug?: string | null; verified: boolean;
}
export type PostType = "Question" | "Showcase" | "Guide";
export interface PostSummary {
  id: string; type: PostType; title: string; excerpt: string; speciesIds: string[]; topics: string[]; likes: number; comments: number;
  answered: boolean; createdAt: string; lastActivityAt: string; thumbUrl?: string | null; author?: CommunityAuthor;
}
