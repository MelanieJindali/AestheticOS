/**
 * Plain-language consent text (GDPR Art. 7 & 9 standard: specific, informed,
 * unambiguous, as easy to withdraw as to give). Shown to the client on the
 * artist's device before they sign.
 */
export function consentText(businessName: string, scope: string[], platforms: string, allowFace: boolean, allowTagging: boolean, months: number) {
  return [
    `I agree that ${businessName} may take and share photos of my treatment results${scope.includes("before-after") ? ", including before and after photos" : ""}${scope.includes("testimonial") ? ", and quote my review" : ""}.`,
    `Where: ${platforms === "all" ? "their social media, website and Google Business Profile" : platforms}.`,
    allowFace ? "My face may be visible." : "My face will not be shown, only the treated area.",
    allowTagging ? "I may be tagged." : "I will not be named or tagged.",
    "Photos will not be edited to change the result.",
    `This consent lasts ${months} months. I can withdraw it at any time by telling ${businessName}. New posts will stop, and they will remove existing posts where they can.`,
    "I do not have to agree, and saying no will not affect my treatment.",
  ].join(" ");
}

