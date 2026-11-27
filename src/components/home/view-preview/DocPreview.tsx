import React from "react";
import type { RecentBoardDocBlock, RecentBoardPreview } from "@/types/personal";

/** Blocks the page has room for. */
const BLOCK_LIMIT = 7;

const DocBlock: React.FC<{ block: RecentBoardDocBlock; number: number }> = ({ block, number }) => {
  switch (block.type) {
    case "heading":
      return <p className="vp-doc__heading" data-level={Math.min(3, block.level ?? 1)}>{block.text ?? "Untitled"}</p>;
    case "bullet":
    case "numbered":
      return (
        <p className="vp-doc__item">
          <span className="vp-doc__marker">{block.type === "numbered" ? `${number}.` : "•"}</span>
          <span className="vp-doc__text">{block.text}</span>
        </p>
      );
    case "todo":
      return (
        <p className="vp-doc__item vp-doc__todo" data-checked={block.checked ?? false}>
          <span className="vp-doc__checkbox" />
          <span className="vp-doc__text">{block.text}</span>
        </p>
      );
    case "image":
      return <span className="vp-doc__image" />;
    case "code":
      return (
        <span className="vp-doc__code">
          <i />
          <i />
        </span>
      );
    case "quote":
      return <p className="vp-doc__quote">{block.text}</p>;
    case "divider":
      return <hr className="vp-doc__divider" />;
    case "table":
      return <span className="vp-doc__table" />;
    default:
      return <p className="vp-doc__paragraph">{block.text}</p>;
  }
};

/**
 * A mini Doc page: the document's real outline (headings, text, lists, to
 * dos with their checks, images, code) set on a sheet of paper, so the card
 * reads like the doc itself.
 */
const DocPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const blocks = (preview.doc?.blocks ?? []).slice(0, BLOCK_LIMIT);
  // Numbered list items count up within their own run.
  let list_number = 0;

  return (
    <div className="vp-doc">
      <div className="vp-doc__page">
        {blocks.length === 0 ? (
          <>
            <p className="vp-doc__heading vp-doc__heading--empty" data-level={1}>
              Untitled
            </p>
            <span className="vp-doc__skeleton" />
            <span className="vp-doc__skeleton" />
            <span className="vp-doc__skeleton vp-doc__skeleton--short" />
          </>
        ) : (
          blocks.map((block, index) => {
            list_number = block.type === "numbered" ? list_number + 1 : 0;
            return <DocBlock key={index} block={block} number={list_number} />;
          })
        )}
      </div>
    </div>
  );
};

export default DocPreview;
