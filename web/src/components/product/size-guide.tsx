import { RichText } from "@/components/ui/rich-text";

const steps = [
  ["Bust", "Measure around the fullest part of your bust, keeping the tape level under your arms."],
  ["Waist", "Measure around your natural waistline, the narrowest part of your torso."],
  ["Hips", "Stand with feet together and measure around the fullest part of your hips."],
  ["Shirt length", "Measure from the highest point of the shoulder down to where you want the hem."],
];

/** The size chart itself is store data (Admin → Content → Size Guide); measuring tips are universal. */
export function SizeGuideContent({ body }: { body: string }) {
  return (
    <div className="mt-6 space-y-8">
      {body ? (
        <RichText text={body} />
      ) : (
        <p className="border border-dashed border-taupe p-4 text-sm text-cocoa">
          The detailed size chart will appear here once it is added in Admin → Content → Size Guide.
        </p>
      )}
      <div>
        <h3 className="label">How to measure</h3>
        <dl className="mt-4 space-y-4 text-sm">
          {steps.map(([term, text]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="mt-1 text-cocoa">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-cocoa">Between sizes? Choose the larger size for a relaxed fit.</p>
      </div>
    </div>
  );
}
