import type { RichTextProps } from "@/lib/blocks";
import DOMPurify from "isomorphic-dompurify";

export default function RichTextBlock({ props }: { props: RichTextProps }) {
  // Sanitise HTML to prevent XSS — no arbitrary code execution
  const clean = DOMPurify.sanitize(props.html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "a", "blockquote", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <section className="py-12 px-6">
      <div
        className="max-w-2xl mx-auto prose prose-slate"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </section>
  );
}
