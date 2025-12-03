// import { useEffect, useState } from "react";
// import { ArrowRightIcon, ChevronLeftIcon, BuildingIcon, TrendingUpIcon, BanknoteIcon, ShieldIcon, CheckIcon } from "lucide-react";
// import { Button } from "@/components/ui/button";

// interface AssetSelectionProps {
//   selected: string[];
//   onChange: (selected: string[]) => void;
//   onContinue: () => void;
//   onBack: () => void;
// }

// export const AssetSelection = ({ selected, onChange, onContinue, onBack }: AssetSelectionProps) => {
//   const assets = [
//     {
//       id: 'mutual_funds',
//       name: 'Mutual Funds',
//       description: 'SIPs, lump sum investments, and portfolio holdings',
//       icon: TrendingUpIcon,
//       color: '#0a9f83'
//     },
//     {
//       id: 'stocks',
//       name: 'Stocks & Demat',
//       description: 'Equity holdings and trading accounts',
//       icon: BuildingIcon,
//       color: '#3b82f6'
//     },
//     {
//       id: 'banks',
//       name: 'Bank Accounts',
//       description: 'Savings, current accounts, and FDs',
//       icon: BanknoteIcon,
//       color: '#8b5cf6'
//     },
//     {
//       id: 'insurance',
//       name: 'Insurance',
//       description: 'Life, health, and term insurance policies',
//       icon: ShieldIcon,
//       color: '#f59e0b'
//     }
//   ];

//   const toggleAsset = (id: string) => {
//     if (selected.includes(id)) {
//       onChange(selected.filter(item => item !== id));
//     } else {
//       onChange([...selected, id]);
//     }
//   };

//   const isValid = selected.length > 0;


//   return (
//     <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">
//       {/* Gradient overlay */}
//       <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
//         <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
//       </div>

//       {/* Header */}
//       <header className="flex-shrink-0 w-full h-16">
//         <div className="flex items-center h-full px-4">
//           <button
//             onClick={onBack}
//             className="p-2 -ml-2"
//             data-testid="button-back"
//           >
//             <ChevronLeftIcon className="w-6 h-6 text-[#cfd0d0]" />
//           </button>
//         </div>
//       </header>

//       {/* Main content */}
//       <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">
//         <div className="space-y-6">
//           <div className="space-y-2">
//             <h1 className="[font-family:'Be_Vietnam_Pro',Helvetica] font-semibold text-[#cfd0d0] text-[28px] tracking-[-0.5px] leading-[34px]">
//               Select your investments
//             </h1>
//             <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-sm leading-5">
//               Choose at least one category to continue
//             </p>
//           </div>

//           {/* Asset cards */}
//           <div className="space-y-3 pt-4">
//             {assets.map((asset) => {
//               const Icon = asset.icon;
//               const isSelected = selected.includes(asset.id);

//               return (
//                 <button
//                   key={asset.id}
//                   onClick={() => toggleAsset(asset.id)}
//                   className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${isSelected
//                     ? 'bg-[#1a1b1d] border-[#0a9f83]'
//                     : 'bg-[#1a1b1d] border-[#2a2b2d] hover:border-[#3a3b3d]'
//                     }`}
//                   data-testid={`asset-${asset.id}`}
//                 >
//                   <div
//                     className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
//                     style={{ backgroundColor: `${asset.color}20` }}
//                   >
//                     <Icon className="w-6 h-6" style={{ color: asset.color }} />
//                   </div>
//                   <div className="flex-1 text-left">
//                     <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-medium text-[#cfd0d0] text-sm mb-1">
//                       {asset.name}
//                     </p>
//                     <p className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs leading-[18px]">
//                       {asset.description}
//                     </p>
//                   </div>
//                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
//                     ? 'bg-[#0a9f83] border-[#0a9f83]'
//                     : 'border-[#3a3b3d]'
//                     }`}>
//                     {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
//                   </div>
//                 </button>
//               );
//             })}
//           </div>

//           {/* Info */}
//           {!isValid && (
//             <p className="text-center [font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#a2a2a2] text-xs pt-2">
//               Select at least one to proceed
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="mt-auto px-4 py-6">
//         <Button
//           onClick={onContinue}
//           disabled={!isValid}
//           className="relative w-full h-12 bg-[#f3f3f3] rounded-lg hover:bg-[#e8e8e8] disabled:opacity-40 disabled:cursor-not-allowed"
//           data-testid="button-continue"
//         >
//           <span className="[font-family:'Be_Vietnam_Pro',Helvetica] font-light text-[#131313] text-sm leading-6">
//             Continue ({selected.length} selected)
//           </span>
//           <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
//         </Button>
//       </div>
//     </div>
//   );
// };


import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  BuildingIcon,
  TrendingUpIcon,
  BanknoteIcon,
  ShieldIcon,
  CheckIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface AssetSelectionProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const AssetSelection = ({ selected, onChange, onContinue, onBack }: AssetSelectionProps) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { authFetch, isAuthenticated } = useAuth();

  // Map FIP type → icon + color
  const iconMap: Record<string, any> = {
    mutual_funds: { icon: TrendingUpIcon, color: "#0a9f83" },
    equities: { icon: BuildingIcon, color: "#3b82f6" },
    deposit: { icon: BanknoteIcon, color: "#8b5cf6" },
    term_deposit: { icon: BanknoteIcon, color: "#8b5cf6" },
    general_insurance: { icon: ShieldIcon, color: "#f59e0b" },
  };

  //FETCH API
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated) {
          console.log("User not authenticated, showing login required message");
          setError("Please login to view your available asset categories");
          setLoading(false);
          return; // Exit gracefully - no assets without authentication
        }

        const response = await authFetch("https://aa-dev.rudowealth.in/api/v1/customer/consents", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please login again.");
          }
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();
        console.log("fetched data", json);

        if (Array.isArray(json)) {
          const formatted = json.map((item: any) => {
            const key = item.fipType?.toLowerCase();
            const fallback = iconMap[key] || {};

            return {
              id: key,
              name: item.fipLabel,
              description: item.description,

              templateId: item.templateId,
              fipType: item.fipType,
              status: item.status,
              // consentHandleId: item.consentHandleId,

              icon: fallback.icon || TrendingUpIcon,
              color: fallback.color || "#0a9f83",
            };
          });

          setAssets(formatted);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load asset categories.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  const toggleAsset = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const isValid = selected.length > 0;

  return (
    <div className="relative flex flex-col w-full max-w-md h-full bg-[#08090a] mx-auto">

      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(114deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <div className="w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.06)_30%,rgba(255,255,255,0)_60%)]" />
      </div>

      {/* Header */}
      <header className="flex-shrink-0 w-full h-16">
        <div className="flex items-center h-full px-4">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeftIcon className="w-6 h-6 text-[#cfd0d0]" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-8">

        {loading && <p className="text-center text-[#a2a2a2]">Loading...</p>}
        {error && <p className="text-center text-red-400">{error}</p>}

        {!loading && !error && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-semibold text-[#cfd0d0] text-[28px]">
                Select your investments
              </h1>
              <p className="font-light text-[#a2a2a2] text-sm">
                Choose at least one category to continue
              </p>
            </div>

            {/* ASSET LIST */}
            <div className="space-y-3 pt-4">
              {assets.map((asset) => {
                const Icon = asset.icon;
                const isSelected = selected.includes(asset.id);

                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${isSelected
                      ? "bg-[#1a1b1d] border-[#0a9f83]"
                      : "bg-[#1a1b1d] border-[#2a2b2d] hover:border-[#3a3b3d]"
                      }`}
                  >
                    {/* ICON */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${asset.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: asset.color }} />
                    </div>

                    {/* TEXT */}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[#cfd0d0] text-sm mb-1">
                        {asset.name}
                      </p>
                      <p className="font-light text-[#a2a2a2] text-xs">
                        {asset.description}
                      </p>
                    </div>

                    {/* CHECKMARK */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                        ? "bg-[#0a9f83] border-[#0a9f83]"
                        : "border-[#3a3b3d]"
                        }`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {!isValid && (
              <p className="text-center text-[#a2a2a2] text-xs pt-2">
                Select at least one to proceed
              </p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-auto px-4 py-6">
        <Button
          // onClick={onContinue}
          onClick={() => {
            console.log("Selected IDs:", selected);
            console.log("Selected data", assets.filter(a => selected.includes(a.id)));
            // onContinue();
          }}

          disabled={!isValid}
          className="w-full h-12 bg-[#f3f3f3] rounded-lg disabled:opacity-40"
        >
          <span className="text-[#131313] text-sm">
            Continue ({selected.length} selected)
          </span>
          <ArrowRightIcon className="absolute right-5 w-5 h-5 text-[#131313]" />
        </Button>
      </div>
    </div>
  );
};


