import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PortfolioPreviewProps {
  onContinue: () => void;
}

const verticalLines = [
  { left: "left-[51px]" },
  { left: "left-[76px]" },
  { left: "left-[101px]" },
  { left: "left-[126px]" },
  { left: "left-[151px]" },
  { left: "left-44" },
  { left: "left-[201px]" },
  { left: "left-[226px]" },
  { left: "left-[251px]" },
  { left: "left-[276px]" },
];

const horizontalLines = [
  { top: "top-[-115px]" },
  { top: "top-[-91px]" },
  { top: "top-[-67px]" },
  { top: "top-[-43px]" },
  { top: "top-[-19px]" },
  { top: "top-[5px]" },
  { top: "top-[29px]" },
  { top: "top-[53px]" },
  { top: "top-[77px]" },
  { top: "top-[101px]" },
  { top: "top-[125px]" },
];

export const PortfolioPreview = ({ onContinue }: PortfolioPreviewProps): JSX.Element => {
  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      <header className="flex-shrink-0 w-full h-16">
        <div className="flex items-center justify-end h-full px-4">
          <div className="flex gap-0.5 items-center">
            <div className="w-[23px] h-4 [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#b3b3b3] text-[8px] text-right tracking-[0] leading-4 whitespace-nowrap">
              3 of 3
            </div>

            <div className="w-20 self-center flex items-center bg-neutral-50 rounded-2xl overflow-hidden">
              <Progress
                value={100}
                className="h-0.5 w-20 bg-transparent [&>div]:bg-[#0a9f83]"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="flex flex-col justify-between">
          {/* Chart visualization */}
          <div className="relative h-[328px] overflow-hidden mb-8">
            {verticalLines.map((line, index) => (
              <div
                key={`vertical-${index}`}
                className={`absolute top-[calc(50.00%_-_164px)] ${line.left} w-px h-[328px] bg-[linear-gradient(180deg,rgba(173,167,133,0)_0%,rgba(173,167,133,0.28)_50%,rgba(173,167,133,0)_100%)]`}
              />
            ))}

            {horizontalLines.map((line, index) => (
              <div
                key={`horizontal-${index}`}
                className={`absolute ${line.top} left-[50.00%] w-px h-[328px] rotate-90 bg-[linear-gradient(180deg,rgba(173,167,133,0)_0%,rgba(173,167,133,0.28)_50%,rgba(173,167,133,0)_100%)]`}
              />
            ))}

            <img
              className="w-[330px] h-[233px] absolute top-[70px] -left-0.5"
              alt="Vector"
              src="/figmaAssets/vector-11.svg"
            />

            <img
              className="w-[249px] h-[132px] absolute top-[70px] -left-0.5"
              alt="Vector"
              src="/figmaAssets/vector-12.svg"
            />

            <div className="absolute top-[53px] left-[calc(50.00%_+_50px)] [font-family:'Be_Vietnam_Pro',Helvetica] font-medium italic text-transparent text-lg tracking-[0] leading-6 whitespace-nowrap bg-clip-text bg-gradient-to-r from-[#0a9f83] to-[#06b894]">
              Now
            </div>

            <div className="absolute top-[77px] left-[calc(50.00%_+_50px)] [font-family:'Be_Vietnam_Pro',Helvetica] font-bold text-[#0a9f83] text-2xl tracking-[0] leading-6 whitespace-nowrap">
              10.30%
            </div>

            <img
              className="absolute top-[39px] left-[254px] w-8 h-8"
              alt="Icon"
              src="/figmaAssets/icon.svg"
            />

            <div className="absolute top-[108px] left-[222px] w-3.5 h-3.5 bg-[#0e8345] rounded-[7px] border-2 border-solid border-neutral-50" />

            <div className="inline-flex flex-col items-center absolute top-[124px] left-[181px]">
              <div className="inline-flex h-2 items-end justify-center gap-2.5 px-2.5 py-0 relative">
                <img
                  className="relative w-[8.51px] h-[9.69px] mb-[-3.25px]"
                  alt="Polygon"
                  src="/figmaAssets/polygon-1.svg"
                />
              </div>

              <div className="inline-flex items-start gap-2.5 px-[18px] py-[5px] relative flex-[0_0_auto] bg-neutral-50 rounded-[35px]">
                <div className="relative w-fit mt-[-1.00px] [font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#131313] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                  Your returns
                </div>
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-4">
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-normal text-[#cfd0d0] text-[32px] tracking-[-1.00px] leading-10">
              View your portfolio at a glance.
            </h1>

            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm tracking-[0] leading-5">
              Get valuable insights into how diversified your investments are.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto px-4 py-6">
        <Button 
          onClick={onContinue}
          className="relative w-full h-12 bg-[#f3f3f3] rounded-lg overflow-hidden hover:bg-[#e8e8e8]"
          data-testid="button-continue"
        >
          <span className="relative flex items-center justify-center w-fit [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm tracking-[0] leading-6 whitespace-nowrap">
            Go to Dashboard
          </span>
          <ArrowRightIcon className="absolute top-3 right-5 w-6 h-6 text-[#131313]" />
        </Button>
      </div>
    </div>
  );
};
