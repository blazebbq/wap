import type { Block } from "@/lib/blocks";
import HeroBlock from "./HeroBlock";
import ServicesBlock from "./ServicesBlock";
import RichTextBlock from "./RichTextBlock";
import ContactBlock from "./ContactBlock";
import { Suspense } from "react";

// Cast async server component to avoid TypeScript JSX element type mismatch
const AsyncServicesBlock = ServicesBlock as unknown as (props: {
  props: Parameters<typeof ServicesBlock>[0]["props"];
}) => JSX.Element;

export default function BlockRenderer({
  blocks,
  businessId,
}: {
  blocks: Block[];
  businessId?: string;
}) {
  return (
    <div>
      {blocks.map((block) => {
        switch (block.type) {
          case "hero":
            return (
              <HeroBlock
                key={block.id}
                props={block.props}
                businessId={businessId}
              />
            );
          case "services":
            return (
              <Suspense key={block.id} fallback={null}>
                <AsyncServicesBlock props={block.props} />
              </Suspense>
            );
          case "richText":
            return <RichTextBlock key={block.id} props={block.props} />;
          case "contact":
            return <ContactBlock key={block.id} props={block.props} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
