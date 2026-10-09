import React from "react";
import { ChannelBadge } from "../CommunicationTemplateCard";
import { splitTitle } from "../communicationTemplates";
import { recipeChannel, type SlackRecipe } from "./slackRecipes";

export type SlackRecipeCardProps = {
  recipe: SlackRecipe;
  /** `large` is the Slack app page card, `regular` matches the Integrate dialog's template cards. */
  size?: "large" | "regular";
  onUse: (recipe: SlackRecipe) => void;
};

const STYLES = {
  large: { card: "min-h-[220px] rounded-[6px] bg-boardtree-surface p-4 hover:shadow-[0_6px_18px_rgba(30,34,55,0.10)]", title: "mt-6 text-[17px]", button: "rounded-[4px] text-[13px]" },
  regular: { card: "rounded-[10px] p-3.5 hover:shadow-[0_4px_14px_rgba(30,34,55,0.08)]", title: "mt-3 text-[13.5px]", button: "rounded-[6px] text-[12.5px]" },
};

/** One Slack recipe as a monday.com template card: the app to Slack strip, the sentence and "Use template". */
export default function SlackRecipeCard({ recipe, size = "large", onUse }: SlackRecipeCardProps) {
  const styles = STYLES[size];

  return (
    <article className={`flex flex-col justify-between gap-4 border border-boardtree-border-soft transition-shadow ${styles.card}`}>
      <div>
        <ChannelBadge channel={recipeChannel(recipe)} />
        <p className={`leading-snug text-boardtree-text-secondary ${styles.title}`}>
          {splitTitle(recipe.title).map((segment, index) => (
            <span key={index} className={segment.is_bold ? "font-semibold text-boardtree-text" : undefined}>{segment.text}</span>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onUse(recipe)}
        aria-label={`Use template: ${recipe.title.replaceAll("**", "")}`}
        className={`h-8 w-full border border-boardtree-border text-boardtree-text hover:bg-boardtree-hover ${styles.button}`}
      >
        Use template
      </button>
    </article>
  );
}
