"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard/dashboard.module.css";

const INITIAL_ONBOARDING = {
  account_full_name: "",
  account_email: "",
  phone_number: "",
  name: "",
  website: "",
  role_type: "",
  business_type: "",
  business_type_other: "",
  industry_sector: "",
  industry_sector_other: "",
  country: "",
  city: "",
  product_name: "",
  product_categories_json: [] as string[],
  product_subcategories_json: [] as string[],
  price_tier: "",
  target_market_geo: "",
  key_product_features: "",
  base_price: "",
  availability_status: "",
  preferred_competitor_platforms: "",
  category: "",
  target_market: "",
  country_other: "",
  product_category_other: "",
  product_subcategory_other: "",
};

const INDUSTRY_OPTIONS = [
  "Fashion",
  "Electronics",
  "Home Appliances",
  "Sports",
  "Health",
  "Beauty",
  "Others",
];
const PRODUCT_CATEGORY_OPTIONS = [
  "Men's Shoes",
  "Women's Shoes",
  "Smartphones",
  "Laptops",
  "Others",
];
const PRODUCT_SUBCATEGORY_OPTIONS = [
  "Running Shoes",
  "Casual Shoes",
  "Android",
  "iOS",
  "Gaming Laptop",
  "Others",
];
const COUNTRY_OPTIONS = ["India", "United States", "United Kingdom", "Germany", "UAE", "Singapore", "Others"];

const ONBOARDING_STEPS = [
  { id: 1, title: "Business Info", hint: "Tell us who you are and where you operate." },
  { id: 2, title: "Product Info", hint: "Add your key products to track competitors effectively." },
  { id: 3, title: "Competitor Preferences", hint: "Set market and platform preferences for discovery." },
  { id: 4, title: "Review & Submit", hint: "Review all information before completing onboarding." },
] as const;

const ROLE_CHIPS: Array<{ label: string; icon: "role" | "building" | "rocket" | "spark" }> = [
  { label: "Founder", icon: "role" },
  { label: "Manager", icon: "building" },
  { label: "Operations", icon: "spark" },
  { label: "Growth", icon: "rocket" },
  { label: "Others", icon: "spark" },
];

const BUSINESS_TYPE_CHIPS: Array<{
  label: string;
  icon: "rocket" | "building" | "store" | "factory" | "truck" | "spark";
}> = [
  { label: "SaaS", icon: "rocket" },
  { label: "Agency", icon: "building" },
  { label: "E-commerce", icon: "store" },
  { label: "Manufacturer", icon: "factory" },
  { label: "Distributor", icon: "truck" },
  { label: "Others", icon: "spark" },
];

function isOthersSelected(value?: string | null) {
  return (value || "").trim().toLowerCase() === "others";
}

function ChipIcon({ kind }: { kind: "role" | "building" | "rocket" | "store" | "factory" | "truck" | "spark" }) {
  if (kind === "role") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  if (kind === "building") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V6l8-3 8 3v14" />
        <path d="M9 9h1M14 9h1M9 13h1M14 13h1M11 20v-4h2v4" />
      </svg>
    );
  }
  if (kind === "rocket") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3c3 0 7 4 7 7-5 0-8 2-10 4-2-2-4-5-4-10 3 0 7-1 7-1Z" />
        <path d="M7 14l-3 6 6-3" />
      </svg>
    );
  }
  if (kind === "store") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10h18l-1-5H4l-1 5Z" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }
  if (kind === "factory") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 20V9l6 3V9l6 3V6l6 3v11" />
      </svg>
    );
  }
  if (kind === "truck") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v8H3Z" />
        <path d="M14 10h4l3 3v2h-7Z" />
        <path d="M7 18a1.5 1.5 0 1 0 0 .1M18 18a1.5 1.5 0 1 0 0 .1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  const [onboarding, setOnboarding] = useState(INITIAL_ONBOARDING);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);
  const [onboardingErrors, setOnboardingErrors] = useState<Record<string, string>>({});
  const [categorySearch, setCategorySearch] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [roleTypeOther, setRoleTypeOther] = useState("");

  const getStoredToken = () => {
    try {
      return localStorage.getItem("token") || sessionStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const clearStoredToken = () => {
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch {
      // Ignore storage cleanup failures.
    }
  };

  const authFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const token = getStoredToken();
      if (!token) {
        router.replace("/");
        return null;
      }

      const headers = new Headers(opts.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      if (!(opts.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      let requestUrl = url;
      if (!url.startsWith("http")) {
        const base = API_BASE.replace(/\/+$/, "");
        const path = url.startsWith("/") ? url : `/${url}`;
        const hasApiPrefixInBase = /\/api\/v1$/i.test(base);
        const normalizedPath = hasApiPrefixInBase
          ? path.replace(/^\/api\/v1(?=\/|$)/i, "") || "/"
          : path;
        requestUrl = `${base}${normalizedPath}`;
      }

      const response = await fetch(requestUrl, {
        ...opts,
        headers,
      });

      return response;
    },
    [API_BASE, router],
  );

  const handleSessionInvalid = useCallback(() => {
    clearStoredToken();
    setSessionReady(false);
    setError("Session expired or invalid. Please sign in again.");
    router.replace("/");
  }, [router]);

  const ensureSession = useCallback(async () => {
    const response = await authFetch("/api/v1/users/me");
    if (!response || response.status === 401 || response.status === 403) {
      handleSessionInvalid();
      return false;
    }
    if (!response.ok) {
      throw new Error("Failed to validate your session.");
    }
    const user = (await response.json()) as { full_name?: string; email?: string };
    setOnboarding((current) => ({
      ...current,
      account_full_name: current.account_full_name || user.full_name || "",
      account_email: current.account_email || user.email || "",
    }));
    return true;
  }, [authFetch, handleSessionInvalid]);

  const toggleMultiValue = (
    field: "product_categories_json" | "product_subcategories_json",
    value: string,
  ) => {
    setOnboarding((current) => {
      const existing = current[field];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];
      return { ...current, [field]: next };
    });
  };

  const setOnboardingField = (field: keyof typeof INITIAL_ONBOARDING, value: string | string[]) => {
    setOnboarding((current) => ({ ...current, [field]: value }));
    setOnboardingErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const selectRoleType = (value: string) => {
    setOnboardingField("role_type", value);
    if (!isOthersSelected(value)) {
      setRoleTypeOther("");
    }
  };

  const selectBusinessType = (value: string) => {
    setOnboardingField("business_type", value);
    if (!isOthersSelected(value)) {
      setOnboardingField("business_type_other", "");
    }
  };

  const validateStep = (step: 1 | 2 | 3 | 4) => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!onboarding.account_full_name.trim()) errors.account_full_name = "Full name is required.";
      if (!onboarding.account_email.trim()) errors.account_email = "Email is required.";
      if (!onboarding.phone_number.trim()) errors.phone_number = "Phone number is required.";
      if (!onboarding.name.trim()) errors.name = "Business name is required.";
      if (!onboarding.role_type.trim()) errors.role_type = "Role type is required.";
      if (isOthersSelected(onboarding.role_type) && !roleTypeOther.trim()) {
        errors.role_type = "Please specify your role type.";
      }
      if (isOthersSelected(onboarding.business_type) && !onboarding.business_type_other.trim()) {
        errors.business_type_other = "Please specify your business type.";
      }
      if (
        isOthersSelected(onboarding.industry_sector) &&
        !onboarding.industry_sector_other.trim()
      ) {
        errors.industry_sector_other = "Please specify your industry sector.";
      }
      if (isOthersSelected(onboarding.country) && !onboarding.country_other.trim()) {
        errors.country_other = "Please specify your country.";
      }
    }
    if (step === 2) {
      if (!onboarding.product_name.trim()) errors.product_name = "Product name is required.";
      if (onboarding.product_categories_json.length === 0)
        errors.product_categories_json = "Select at least one product category.";
      if (onboarding.product_subcategories_json.length === 0)
        errors.product_subcategories_json = "Select at least one product subcategory.";
      if (!onboarding.key_product_features.trim())
        errors.key_product_features = "Add key product features/specs.";
      if (!onboarding.base_price.toString().trim()) errors.base_price = "Base price is required.";
      if (
        onboarding.product_categories_json.some((item) => item.trim().toLowerCase() === "others") &&
        !onboarding.product_category_other.trim()
      ) {
        errors.product_category_other = "Please specify the other product category.";
      }
      if (
        onboarding.product_subcategories_json.some(
          (item) => item.trim().toLowerCase() === "others",
        ) &&
        !onboarding.product_subcategory_other.trim()
      ) {
        errors.product_subcategory_other = "Please specify the other product subcategory.";
      }
    }
    if (step === 3) {
      if (!onboarding.target_market_geo.trim()) errors.target_market_geo = "Target market is required.";
      if (!onboarding.availability_status.trim())
        errors.availability_status = "Availability status is required.";
      if (!onboarding.preferred_competitor_platforms.trim())
        errors.preferred_competitor_platforms = "Preferred platforms are required.";
    }

    setOnboardingErrors((current) => ({ ...current, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const goToStep = (target: 1 | 2 | 3 | 4) => {
    if (target > onboardingStep && !validateStep(onboardingStep)) {
      return;
    }
    setOnboardingStep(target);
  };

  const addCustomCategory = () => {
    const value = customCategory.trim();
    if (!value) return;
    toggleMultiValue("product_categories_json", value);
    setCustomCategory("");
  };

  const addCustomSubcategory = () => {
    const value = customSubcategory.trim();
    if (!value) return;
    toggleMultiValue("product_subcategories_json", value);
    setCustomSubcategory("");
  };

  const createBusinessFromOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError("Please complete required onboarding fields before submission.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await authFetch("/api/v1/businesses/", {
        method: "POST",
        body: JSON.stringify({
          ...onboarding,
          role_type: isOthersSelected(onboarding.role_type) ? roleTypeOther : onboarding.role_type,
          category:
            (isOthersSelected(onboarding.industry_sector)
              ? onboarding.industry_sector_other
              : onboarding.industry_sector) || onboarding.category,
          target_market: onboarding.target_market_geo || onboarding.target_market,
          country: isOthersSelected(onboarding.country) ? onboarding.country_other : onboarding.country,
          product_categories_json: onboarding.product_categories_json.map((item) =>
            item.trim().toLowerCase() === "others"
              ? onboarding.product_category_other.trim() || item
              : item,
          ),
          product_subcategories_json: onboarding.product_subcategories_json.map((item) =>
            item.trim().toLowerCase() === "others"
              ? onboarding.product_subcategory_other.trim() || item
              : item,
          ),
          base_price: onboarding.base_price ? Number(onboarding.base_price) : null,
        }),
      });

      if (!response) {
        return;
      }
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Failed to save onboarding details.");
      }

      setOnboarding(INITIAL_ONBOARDING);
      setRoleTypeOther("");
      setSuccess("Onboarding completed! Redirecting to dashboard...");
      
      // Redirect to discovery section after successful onboarding
      setTimeout(() => {
        router.push("/dashboard/discovery");
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding details.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    router.push("/");
  };

  useEffect(() => {
    setLoading(true);
    setError("");

    ensureSession()
      .then((ok) => {
        if (!ok) {
          return;
        }
        setSessionReady(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to initialize onboarding.");
      })
      .finally(() => setLoading(false));
  }, [ensureSession]);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading onboarding...</p>
      </div>
    );
  }

  if (!sessionReady) {
    return null;
  }

  const completionPct = Math.round((onboardingStep / 4) * 100);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <h1>INTELOPS Workspace</h1>
          <p>Onboard your business, discover competitors, scrape data, and track changes.</p>
        </div>
        <button type="button" className={styles.ghostBtn} onClick={logout}>
          Logout
        </button>
      </header>

      {error ? <div className={styles.errorBox}>{error}</div> : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}

      <section className={styles.card}>
        <div className={styles.rowBetween}>
          <div>
            <h2>Guided Setup Progress</h2>
            <p className={styles.muted}>Follow this flow to reach automatic change insights.</p>
          </div>
          <strong>{completionPct}% complete</strong>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${completionPct}%` }} />
        </div>
      </section>

      <section className={`${styles.card} ${styles.wizardCard}`}>
        <h2>Business Onboarding</h2>
        <p className={styles.muted}>Complete these 4 steps once. This profile is used for discovery and reporting.</p>

        <div className={styles.wizardProgress}>
          {ONBOARDING_STEPS.map((step) => {
            const complete = onboardingStep > step.id;
            const active = onboardingStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                className={`${styles.wizardStep} ${active ? styles.wizardStepActive : ""} ${complete ? styles.wizardStepDone : ""}`}
                onClick={() => goToStep(step.id)}
              >
                <span>{complete ? "✓" : step.id}</span>
                <strong>{step.title}</strong>
              </button>
            );
          })}
        </div>

        <p className={styles.stepHint}>{ONBOARDING_STEPS[onboardingStep - 1].hint}</p>
        <div className={styles.wizardBar}><div className={styles.wizardBarFill} style={{ width: `${(onboardingStep / 4) * 100}%` }} /></div>

        <form className={styles.formGrid} onSubmit={createBusinessFromOnboarding}>
          {onboardingStep === 1 ? (
            <>
              <label>
                Full Name *
                <input
                  aria-label="Full Name"
                  value={onboarding.account_full_name}
                  onChange={(event) => setOnboardingField("account_full_name", event.target.value)}
                />
                {onboardingErrors.account_full_name ? <small className={styles.fieldError}>{onboardingErrors.account_full_name}</small> : null}
              </label>
              <label>
                Email *
                <input
                  aria-label="Email"
                  type="email"
                  value={onboarding.account_email}
                  onChange={(event) => setOnboardingField("account_email", event.target.value)}
                />
                {onboardingErrors.account_email ? <small className={styles.fieldError}>{onboardingErrors.account_email}</small> : null}
              </label>
              <label>
                Phone Number *
                <input
                  aria-label="Phone Number"
                  value={onboarding.phone_number}
                  onChange={(event) => setOnboardingField("phone_number", event.target.value)}
                />
                {onboardingErrors.phone_number ? <small className={styles.fieldError}>{onboardingErrors.phone_number}</small> : null}
              </label>
              <label>
                Business / Company Name *
                <input
                  aria-label="Business Name"
                  value={onboarding.name}
                  onChange={(event) => setOnboardingField("name", event.target.value)}
                />
                {onboardingErrors.name ? <small className={styles.fieldError}>{onboardingErrors.name}</small> : null}
              </label>
              <div className={styles.fullRow}>
                <div className={styles.choiceGroupHeader}>
                  <span>Role / Type *</span>
                  <small className={styles.mutedSmall}>Select the role closest to your responsibility.</small>
                </div>
                <div className={styles.choiceGrid} role="radiogroup" aria-label="Role Type">
                  {ROLE_CHIPS.map((item) => {
                    const active = onboarding.role_type === item.label;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`${styles.choiceChip} ${active ? styles.choiceChipActive : ""}`}
                        onClick={() => selectRoleType(item.label)}
                      >
                        <span className={styles.choiceChipIcon}>
                          <ChipIcon kind={item.icon} />
                        </span>
                        <span>{item.label === "Others" ? "Other" : item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className={`${styles.inlineExpandWrap} ${isOthersSelected(onboarding.role_type) ? styles.inlineExpandVisible : ""}`}
                  aria-hidden={!isOthersSelected(onboarding.role_type)}
                >
                  <input
                    aria-label="Specify Role Type"
                    value={roleTypeOther}
                    onChange={(event) => setRoleTypeOther(event.target.value)}
                    placeholder="Specify your role"
                  />
                </div>
                {onboardingErrors.role_type ? <small className={styles.fieldError}>{onboardingErrors.role_type}</small> : null}
              </div>

              <div className={styles.fullRow}>
                <div className={styles.choiceGroupHeader}>
                  <span>Business Type *</span>
                  <small className={styles.mutedSmall}>Choose your primary business model.</small>
                </div>
                <div className={styles.choiceGrid} role="radiogroup" aria-label="Business Type">
                  {BUSINESS_TYPE_CHIPS.map((item) => {
                    const active = onboarding.business_type === item.label;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`${styles.choiceChip} ${active ? styles.choiceChipActive : ""}`}
                        onClick={() => selectBusinessType(item.label)}
                      >
                        <span className={styles.choiceChipIcon}>
                          <ChipIcon kind={item.icon} />
                        </span>
                        <span>{item.label === "Others" ? "Other (Specify)" : item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className={`${styles.inlineExpandWrap} ${isOthersSelected(onboarding.business_type) ? styles.inlineExpandVisible : ""}`}
                  aria-hidden={!isOthersSelected(onboarding.business_type)}
                >
                  <input
                    aria-label="Specify Business Type"
                    value={onboarding.business_type_other}
                    onChange={(event) =>
                      setOnboardingField("business_type_other", event.target.value)
                    }
                    placeholder="Specify business type"
                  />
                </div>
                {onboardingErrors.business_type_other ? (
                  <small className={styles.fieldError}>{onboardingErrors.business_type_other}</small>
                ) : null}
              </div>
              <label>
                Industry / Sector
                <input
                  aria-label="Industry Sector"
                  list="industry-options"
                  placeholder="Search industry"
                  value={onboarding.industry_sector}
                  onChange={(event) => setOnboardingField("industry_sector", event.target.value)}
                />
                <datalist id="industry-options">{INDUSTRY_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              {isOthersSelected(onboarding.industry_sector) ? (
                <label>
                  Specify Industry / Sector *
                  <input
                    aria-label="Specify Industry"
                    value={onboarding.industry_sector_other}
                    onChange={(event) =>
                      setOnboardingField("industry_sector_other", event.target.value)
                    }
                    placeholder="Enter your industry"
                  />
                  {onboardingErrors.industry_sector_other ? (
                    <small className={styles.fieldError}>{onboardingErrors.industry_sector_other}</small>
                  ) : null}
                </label>
              ) : null}
              <label>
                Country
                <input
                  aria-label="Country"
                  list="country-options"
                  placeholder="Search country"
                  value={onboarding.country}
                  onChange={(event) => setOnboardingField("country", event.target.value)}
                />
                <datalist id="country-options">{COUNTRY_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              {isOthersSelected(onboarding.country) ? (
                <label>
                  Specify Country *
                  <input
                    aria-label="Specify Country"
                    value={onboarding.country_other}
                    onChange={(event) => setOnboardingField("country_other", event.target.value)}
                    placeholder="Enter country"
                  />
                  {onboardingErrors.country_other ? (
                    <small className={styles.fieldError}>{onboardingErrors.country_other}</small>
                  ) : null}
                </label>
              ) : null}
              <label>
                City
                <input aria-label="City" value={onboarding.city} onChange={(event) => setOnboardingField("city", event.target.value)} />
              </label>
            </>
          ) : null}

          {onboardingStep === 2 ? (
            <>
              <label>
                Product Name *
                <input value={onboarding.product_name} onChange={(event) => setOnboardingField("product_name", event.target.value)} />
                {onboardingErrors.product_name ? <small className={styles.fieldError}>{onboardingErrors.product_name}</small> : null}
              </label>
              <label>
                Base Price / Cost Price *
                <input type="number" step="0.01" value={onboarding.base_price} onChange={(event) => setOnboardingField("base_price", event.target.value)} />
                {onboardingErrors.base_price ? <small className={styles.fieldError}>{onboardingErrors.base_price}</small> : null}
              </label>
              <label>
                Price Tier / Segment
                <input value={onboarding.price_tier} onChange={(event) => setOnboardingField("price_tier", event.target.value)} placeholder="Budget / Mid / Premium" />
              </label>
              <label>
                Website
                <input type="url" value={onboarding.website} onChange={(event) => setOnboardingField("website", event.target.value)} placeholder="https://company.com" />
              </label>
              <label className={styles.fullRow}>
                Key Product Features / Specs *
                <textarea rows={3} value={onboarding.key_product_features} onChange={(event) => setOnboardingField("key_product_features", event.target.value)} placeholder="Example: lightweight, water resistant, 5000mAh battery" />
                {onboardingErrors.key_product_features ? <small className={styles.fieldError}>{onboardingErrors.key_product_features}</small> : <small className={styles.mutedSmall}>Add comma separated specs for better competitor matching.</small>}
              </label>

              <div className={styles.fullRow}>
                <p className={styles.mutedSmall}>Product Category (multi-select) *</p>
                <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search categories" className={styles.searchInput} />
                <div className={styles.multiOptions}>
                  {PRODUCT_CATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(categorySearch.toLowerCase())).map((item) => (
                    <button key={item} type="button" className={`${styles.tagOption} ${onboarding.product_categories_json.includes(item) ? styles.tagOptionActive : ""}`} onClick={() => toggleMultiValue("product_categories_json", item)}>{item}</button>
                  ))}
                </div>
                <div className={styles.tagList}>
                  {onboarding.product_categories_json.map((item) => (
                    <span key={item} className={styles.tagChip}>{item}<button type="button" onClick={() => toggleMultiValue("product_categories_json", item)}>x</button></span>
                  ))}
                </div>
                <div className={styles.inlineAdd}>
                  <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Add custom category" />
                  <button type="button" className={styles.ghostBtn} onClick={addCustomCategory}>Add</button>
                </div>
                {onboarding.product_categories_json.some((item) => item.trim().toLowerCase() === "others") ? (
                  <div className={styles.inlineAdd}>
                    <input
                      value={onboarding.product_category_other}
                      onChange={(event) =>
                        setOnboardingField("product_category_other", event.target.value)
                      }
                      placeholder="Specify Other category"
                      aria-label="Specify Other category"
                    />
                  </div>
                ) : null}
                {onboardingErrors.product_category_other ? (
                  <small className={styles.fieldError}>{onboardingErrors.product_category_other}</small>
                ) : null}
                {onboardingErrors.product_categories_json ? <small className={styles.fieldError}>{onboardingErrors.product_categories_json}</small> : null}
              </div>

              <div className={styles.fullRow}>
                <p className={styles.mutedSmall}>Product Subcategory (multi-select) *</p>
                <input value={subcategorySearch} onChange={(event) => setSubcategorySearch(event.target.value)} placeholder="Search subcategories" className={styles.searchInput} />
                <div className={styles.multiOptions}>
                  {PRODUCT_SUBCATEGORY_OPTIONS.filter((item) => item.toLowerCase().includes(subcategorySearch.toLowerCase())).map((item) => (
                    <button key={item} type="button" className={`${styles.tagOption} ${onboarding.product_subcategories_json.includes(item) ? styles.tagOptionActive : ""}`} onClick={() => toggleMultiValue("product_subcategories_json", item)}>{item}</button>
                  ))}
                </div>
                <div className={styles.tagList}>
                  {onboarding.product_subcategories_json.map((item) => (
                    <span key={item} className={styles.tagChip}>{item}<button type="button" onClick={() => toggleMultiValue("product_subcategories_json", item)}>x</button></span>
                  ))}
                </div>
                <div className={styles.inlineAdd}>
                  <input value={customSubcategory} onChange={(event) => setCustomSubcategory(event.target.value)} placeholder="Add custom subcategory" />
                  <button type="button" className={styles.ghostBtn} onClick={addCustomSubcategory}>Add</button>
                </div>
                {onboarding.product_subcategories_json.some((item) => item.trim().toLowerCase() === "others") ? (
                  <div className={styles.inlineAdd}>
                    <input
                      value={onboarding.product_subcategory_other}
                      onChange={(event) =>
                        setOnboardingField("product_subcategory_other", event.target.value)
                      }
                      placeholder="Specify Other subcategory"
                      aria-label="Specify Other subcategory"
                    />
                  </div>
                ) : null}
                {onboardingErrors.product_subcategory_other ? (
                  <small className={styles.fieldError}>{onboardingErrors.product_subcategory_other}</small>
                ) : null}
                {onboardingErrors.product_subcategories_json ? <small className={styles.fieldError}>{onboardingErrors.product_subcategories_json}</small> : null}
              </div>
            </>
          ) : null}

          {onboardingStep === 3 ? (
            <>
              <label>
                Target Market / Geography *
                <input value={onboarding.target_market_geo} onChange={(event) => setOnboardingField("target_market_geo", event.target.value)} />
                {onboardingErrors.target_market_geo ? <small className={styles.fieldError}>{onboardingErrors.target_market_geo}</small> : null}
              </label>
              <label>
                Availability Status *
                <input value={onboarding.availability_status} onChange={(event) => setOnboardingField("availability_status", event.target.value)} placeholder="In stock / Made to order" />
                {onboardingErrors.availability_status ? <small className={styles.fieldError}>{onboardingErrors.availability_status}</small> : null}
              </label>
              <label className={styles.fullRow}>
                Preferred Competitor Platforms *
                <input value={onboarding.preferred_competitor_platforms} onChange={(event) => setOnboardingField("preferred_competitor_platforms", event.target.value)} placeholder="Amazon, Flipkart, Shopify, Meesho" />
                {onboardingErrors.preferred_competitor_platforms ? <small className={styles.fieldError}>{onboardingErrors.preferred_competitor_platforms}</small> : <small className={styles.mutedSmall}>Separate multiple platforms with commas.</small>}
              </label>
            </>
          ) : null}

          {onboardingStep === 4 ? (
            <div className={styles.fullRow}>
              <div className={styles.reviewGrid}>
                {[
                  ["Full Name", onboarding.account_full_name],
                  ["Email", onboarding.account_email],
                  ["Phone", onboarding.phone_number],
                  ["Business", onboarding.name],
                  [
                    "Role",
                    isOthersSelected(onboarding.role_type)
                      ? roleTypeOther || onboarding.role_type
                      : onboarding.role_type,
                  ],
                  ["Type", onboarding.business_type],
                  ["Industry", onboarding.industry_sector],
                  [
                    "Location",
                    `${onboarding.city}, ${isOthersSelected(onboarding.country) ? onboarding.country_other : onboarding.country}`,
                  ],
                  ["Product", onboarding.product_name],
                  [
                    "Categories",
                    onboarding.product_categories_json
                      .map((item) =>
                        item.trim().toLowerCase() === "others"
                          ? onboarding.product_category_other || item
                          : item,
                      )
                      .join(", "),
                  ],
                  [
                    "Subcategories",
                    onboarding.product_subcategories_json
                      .map((item) =>
                        item.trim().toLowerCase() === "others"
                          ? onboarding.product_subcategory_other || item
                          : item,
                      )
                      .join(", "),
                  ],
                  ["Price Tier", onboarding.price_tier],
                  ["Target Geo", onboarding.target_market_geo],
                  ["Base Price", onboarding.base_price],
                  ["Availability", onboarding.availability_status],
                  ["Preferred Platforms", onboarding.preferred_competitor_platforms],
                ].map(([label, value]) => (
                  <div key={label} className={styles.reviewItem}><strong>{label}</strong><span>{value || "-"}</span></div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.fullRow}>
            <div className={styles.wizardActions}>
              <button type="button" className={styles.secondaryBtn} disabled={onboardingStep === 1} onClick={() => goToStep((Math.max(1, onboardingStep - 1) as 1 | 2 | 3 | 4))}>Back</button>
              {onboardingStep < 4 ? (
                <button type="button" className={styles.primaryBtn} onClick={() => goToStep((Math.min(4, onboardingStep + 1) as 1 | 2 | 3 | 4))}>Next</button>
              ) : (
                <button type="submit" className={styles.primaryBtn} disabled={busy}>Save onboarding</button>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
