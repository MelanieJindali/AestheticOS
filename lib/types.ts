// Core domain types for Aesthetic OS. Every module reads from BrandProfile.
// Rule of thumb: nothing in here should ever need a client's real name,
// contact details or health information. ConsentRecord uses an alias only.

export type ID = string;
export type ISODate = string;

export type Region = "US" | "UK" | "EU" | "CA" | "AU" | "NZ" | "OTHER";

export type LocationType = "studio" | "mobile" | "home" | "virtual";
export type PriceTier = "accessible" | "mid" | "premium" | "luxury";

export type MoodId =
  | "clean-clinical"
  | "soft-luxe"
  | "earthy-organic"
  | "bold-editorial"
  | "minimal-scandi"
  | "y2k-glam";

export type Personality =
  | "warm"
  | "expert"
  | "playful"
  | "calm"
  | "bold"
  | "luxurious"
  | "down-to-earth"
  | "inclusive";

export type Pillar =
  | "education"
  | "transformation"
  | "behind-the-scenes"
  | "testimonials"
  | "offers"
  | "personal-story";

export const PILLARS: Pillar[] = [
  "education",
  "transformation",
  "behind-the-scenes",
  "testimonials",
  "offers",
  "personal-story",
];

export interface Service {
  id: ID;
  name: string;
  durationMin: number;
  price: number;
  /** Direct cost per service (products, consumables). Used by the pricing check. */
  cost?: number;
  description?: string;
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  neutralLight: string;
  neutralDark: string;
}

export interface Typography {
  pairingId: string;
  heading: string;
  body: string;
}

export interface VoiceGuide {
  tone: string[];
  dos: string[];
  donts: string[];
  signOff: string;
  emojiPolicy: "none" | "minimal" | "expressive";
  favouriteEmojis: string[];
}

export interface BrandProfile {
  id: ID;
  userId: ID;
  businessName: string;
  ownerFirstName?: string;
  niche: string; // e.g. "lash & brow studio"
  services: Service[];
  locationType: LocationType;
  city?: string;
  region: Region;
  priceTier: PriceTier;
  idealClient: string;
  personality: Personality[];
  moods: MoodId[];
  palette: Palette;
  typography: Typography;
  texture: string;
  photoStyle: string;
  voice: VoiceGuide;
  bookingUrl?: string;
  handle?: string;
  /** Monthly income goal and fixed costs feed the pricing sanity check. */
  monthlyIncomeGoal?: number;
  monthlyFixedCosts?: number;
  hoursPerWeek?: number;
  currency: string;
  locale: string;
  /** IANA time zone, captured from the browser at onboarding. */
  timezone: string;
  version: number;
  updatedAt: ISODate;
}

export type Platform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "pinterest"
  | "linkedin"
  | "youtube"
  | "x"
  | "threads"
  | "gbp";

export type TemplateType =
  | "before-after"
  | "service-spotlight"
  | "tip"
  | "testimonial"
  | "promo"
  | "availability"
  | "seasonal"
  | "faq"
  | "meet-the-artist"
  | "product";

export interface FormatSpec {
  id: string;
  platform: Platform;
  label: string;
  width: number;
  height: number;
}

export interface SlotValues {
  headline?: string;
  subhead?: string;
  body?: string;
  cta?: string;
  footer?: string;
  imageUrl?: string;
  imageUrlAfter?: string;
  items?: string[];
}

export type PostStatus = "idea" | "draft" | "review" | "approved" | "scheduled" | "published";
export const POST_STATUSES: PostStatus[] = ["idea", "draft", "review", "approved", "scheduled", "published"];

export type PostSource = "pillar" | "service" | "photo" | "note" | "season" | "batch" | "repurpose";

export interface ComplianceIssue {
  ruleId: string;
  severity: "block" | "warn" | "info";
  message: string;
  match?: string;
  suggestion?: string;
  regions?: Region[];
}

export interface Post {
  id: ID;
  userId: ID;
  pillar: Pillar;
  templateType: TemplateType;
  source: PostSource;
  idea: string;
  status: PostStatus;
  isBeforeAfter: boolean;
  /** Paid partnership / gifted product / affiliate link. */
  hasMaterialConnection: boolean;
  consentRecordId?: ID | null;
  seriesId?: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PostVariant {
  id: ID;
  postId: ID;
  userId: ID;
  platform: Platform;
  formatId: string;
  slots: SlotValues;
  caption: string;
  hashtags: string[];
  altText: string;
  ctaUrl?: string;
  suggestedTime?: ISODate;
  kind: "single" | "carousel" | "reel-script" | "story-sequence" | "pin";
  slides?: SlotValues[];
  script?: string[];
  compliance: ComplianceIssue[];
  updatedAt: ISODate;
}

export type ScheduleMode = "direct" | "ready_to_post";
export type ScheduleState = "pending" | "reminded" | "published" | "failed" | "cancelled";

export interface ScheduleItem {
  id: ID;
  userId: ID;
  postId: ID;
  variantId: ID;
  platform: Platform;
  scheduledAt: ISODate;
  mode: ScheduleMode;
  state: ScheduleState;
  externalId?: string;
}

export interface ConnectedAccount {
  id: ID;
  userId: ID;
  platform: Platform;
  accountLabel: string;
  scopes: string[];
  connectedAt: ISODate;
  revokedAt?: ISODate | null;
}

export interface ConsentRecord {
  id: ID;
  userId: ID;
  /** Initials or alias chosen by the artist, never a full name. */
  clientAlias: string;
  scope: ("before-after" | "testimonial" | "portrait")[];
  platforms: Platform[] | "all";
  allowFace: boolean;
  allowTagging: boolean;
  consentTextVersion: string;
  /** SHA-256 over consent text + alias + scope + signature + timestamp. */
  evidenceHash: string;
  signatureSvg: string;
  signedAt: ISODate;
  expiresAt?: ISODate | null;
  revokedAt?: ISODate | null;
}

export interface AgentMemory {
  id: ID;
  userId: ID;
  key: string;
  value: string;
  source: "user" | "muse" | "onboarding";
  updatedAt: ISODate;
}

export interface Task {
  id: ID;
  userId: ID;
  goalId?: ID | null;
  title: string;
  why?: string;
  due?: ISODate | null;
  done: boolean;
  origin: "muse" | "user";
  createdAt: ISODate;
}

export interface Goal {
  id: ID;
  userId: ID;
  weekOf: ISODate;
  title: string;
  progress: number;
}

export interface MetricSnapshot {
  id: ID;
  userId: ID;
  postId: ID;
  platform: Platform;
  reach: number;
  saves: number;
  shares: number;
  profileVisits: number;
  bookings: number;
  capturedAt: ISODate;
  source: "manual" | "api";
}

export type AuditActor = "user" | "muse" | "system";

export interface AuditEntry {
  id: ID;
  userId: ID;
  actor: AuditActor;
  action: string;
  target?: string;
  meta?: Record<string, string | number | boolean | null>;
  createdAt: ISODate;
}

export interface UserSettings {
  userId: ID;
  museCanUseClientData: boolean;
  aiProvider: "local" | "claude";
  remindersPush: boolean;
  remindersEmail: boolean;
  region: Region;
  onboarded: boolean;
}

export interface PushSubscriptionRecord {
  id: ID;
  userId: ID;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: ISODate;
}

export interface Tables {
  brand_profiles: BrandProfile;
  posts: Post;
  post_variants: PostVariant;
  schedule_items: ScheduleItem;
  connected_accounts: ConnectedAccount;
  consent_records: ConsentRecord;
  agent_memory: AgentMemory;
  tasks: Task;
  goals: Goal;
  metric_snapshots: MetricSnapshot;
  audit_log: AuditEntry;
  user_settings: UserSettings & { id: ID };
  push_subscriptions: PushSubscriptionRecord;
}

export type TableName = keyof Tables;
