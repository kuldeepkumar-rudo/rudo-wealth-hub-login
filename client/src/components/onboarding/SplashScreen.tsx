import { useEffect, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SplashScreenProps {
  onContinue: () => void;
}

export const SplashScreen = ({ onContinue }: SplashScreenProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const slides = [
    {
      image: "/figmaAssets/Splash 1.png",
      title: "Track All Your Wealth",
      subtitle: "Mutual Funds, Stocks, FDs, Insurance - All in one place"
    },
    {
      image: "/figmaAssets/Splash 2.png",
      title: "Real-Time Insights",
      subtitle: "Monitor your portfolio performance with live data"
    },
    {
      image: "/figmaAssets/Splash 3.png",
      title: "Smart Recommendations",
      subtitle: "AI-powered investment advice tailored for you"
    }
  ];

  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between">
          {/* Splash image */}
          <div className="flex-1 flex items-center justify-center w-full">
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              className={`w-full max-w-xs object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Text content */}
          <div className="w-full text-center space-y-4 mb-8">
            <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[28px] tracking-[-0.5px] leading-[34px]">
              {slides[currentSlide].title}
            </h1>
            <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm tracking-[0] leading-5">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Slide indicators */}
          <div className="flex gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSlide
                    ? 'w-8 bg-[#0a9f83]'
                    : 'w-1.5 bg-[#3a3a3a]'
                  }`}
                data-testid={`indicator-slide-${index}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-6">
        <Button
          onClick={onContinue}
          className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8]"
          data-testid="button-continue"
        >
          <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </span>
          <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
        </Button>
      </div>
    </div>
  );
};
