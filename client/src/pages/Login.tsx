import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

const emailSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

const otpSchema = z.object({
    otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit OTP"),
});

const mpinSchema = z.object({
    mpin: z.string().regex(/^[0-9]{4}$/, "MPIN must be a 4-digit code"),
    confirmMpin: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type MpinFormValues = z.infer<typeof mpinSchema>;

type Step = "email" | "otp" | "mpin";

const stepOrder: Step[] = ["email", "otp", "mpin"];

interface StepCopy {
    title: string;
    description: string;
    helper?: string;
}

function getStepCopy(step: Step, email: string, mpinStatus?: "create" | "verify" | null): StepCopy {
    switch (step) {
        case "email":
            return {
                title: "Sign in with your Email",
                description: "We will send a one-time passcode to your email inbox.",
            };
        case "otp":
            return {
                title: "Verify OTP",
                description: `Enter the 6-digit code we emailed to ${email}.`,
                helper: "Didn't get the code? Check spam or try resending.",
            };
        case "mpin":
            if (mpinStatus === "create") {
                return {
                    title: "Create MPIN",
                    description: "Create a 4-digit MPIN to secure your account.",
                };
            }
            return {
                title: "Enter MPIN",
                description: "Enter your 4-digit MPIN to complete login.",
            };
        default:
            return {
                title: "Log in",
                description: "Follow the steps to access your account.",
            };
    }
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Something went wrong. Please try again.";
}

export default function Login() {
    const { toast } = useToast();
    const { requestOtp, verifyOtp, verifyEmailOtp, setMpin, verifyMpin, status, isAuthenticated } = useAuth();
    const [location, setLocation] = useLocation();

    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [verifiedOtp, setVerifiedOtp] = useState("");
    const [mpinStatus, setMpinStatus] = useState<"create" | "verify" | null>(null);
    const [sessionToken, setSessionToken] = useState<string>("");

    const nextPath = useMemo(() => {
        const [pathname, search = ""] = location.split("?");
        if (pathname !== "/login") {
            return "/dashboard";
        }
        const params = new URLSearchParams(search);
        const next = params.get("next") || "/dashboard";
        return next.startsWith("/") ? next : `/${next}`;
    }, [location]);

    const emailForm = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });

    const otpForm = useForm<OtpFormValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    const mpinForm = useForm<MpinFormValues>({
        resolver: zodResolver(mpinSchema),
        defaultValues: { mpin: "" },
    });

    useEffect(() => {
        emailForm.reset({ email });
    }, [email, emailForm]);

    useEffect(() => {
        if (isAuthenticated) {
            setLocation(nextPath);
        }
    }, [isAuthenticated, nextPath, setLocation]);

    const isRequestingOtp = status === "requestingOtp";
    const isVerifyingOtp = status === "verifyingOtp";
    const isSettingMpin = status === "settingMpin";

    // Step 1: Send OTP
    const handleEmailSubmit = async (values: EmailFormValues) => {
        const normalizedEmail = values.email.trim().toLowerCase();

        try {
            await requestOtp(normalizedEmail);
            setEmail(normalizedEmail);
            otpForm.reset({ otp: "" });
            setStep("otp");
            toast({
                title: "OTP sent",
                description: `We've emailed a 6-digit code to ${normalizedEmail}.`,
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Unable to send OTP",
                description: getErrorMessage(error),
                variant: "destructive",
            });
        }
    };

    // Step 2: Verify OTP 
    // Step 2: Verify OTP 
    const handleOtpSubmit = async (values: OtpFormValues) => {
        if (!email) {
            toast({
                title: "Session expired",
                description: "Please enter your email again to request a new OTP.",
                variant: "destructive",
            });
            setStep("email");
            return;
        }

        const otp = values.otp.trim();

        try {
            // Verify OTP with backend
            const response = await verifyEmailOtp(email, otp);
            console.log("OTP Verification Response:", response);

            setVerifiedOtp(otp);

            // Handle challenge responses
            if (response.challenge === "MPIN_NOT_SET") {
                setMpinStatus("create");
                setSessionToken(response.sessionId);
                toast({
                    title: "MPIN not set",
                    description: "Please create a new MPIN.",
                });
            } else if (response.challenge === "MPIN_REQUIRED") {
                setMpinStatus("verify");
                setSessionToken(response.sessionId);
                toast({
                    title: "MPIN required",
                    description: "Please enter your MPIN.",
                });
            } else {
                // Direct token response (shouldn't happen for OTP verify, but handle it)
                setMpinStatus("create");
                toast({
                    title: "OTP verified",
                    description: "Please set your MPIN to complete login.",
                });
            }

            mpinForm.reset({ mpin: "" });
            setStep("mpin");
        } catch (error) {
            toast({
                title: "Invalid OTP",
                description: getErrorMessage("Please enter a valid OTP"),
                variant: "destructive",
            });
        }
    };

    // Step 3: Set MPIN and complete login
    const handleMpinSubmit = async (values: MpinFormValues) => {
        if (!email) {
            toast({
                title: "Session expired",
                description: "Please start the login process again.",
                variant: "destructive",
            });
            setStep("email");
            return;
        }

        const mpin = values.mpin.trim();

        try {
            if (mpinStatus === "create") {
                // Validate Confirm MPIN
                if (values.mpin !== values.confirmMpin) {
                    mpinForm.setError("confirmMpin", {
                        type: "manual",
                        message: "MPINs do not match",
                    });
                    return;
                }

                // Create new MPIN
                await setMpin({ email, mpin, sessionToken });
                toast({
                    title: "MPIN created successfully!",
                    description: "Welcome to Rudo Wealth",
                });
            } else {
                // Verify existing MPIN (for returning users)
                await verifyMpin({ email, mpin, sessionToken });
                toast({
                    title: "You're in!",
                    description: "Welcome back to Rudo Wealth",
                });
            }
            setLocation(nextPath);
        } catch (error) {
            toast({
                title: "Login failed",
                description: getErrorMessage(error),
                variant: "destructive",
            });
        }
    };

    const handleBack = () => {
        const currentIndex = stepOrder.indexOf(step);
        if (currentIndex > 0) {
            setStep(stepOrder[currentIndex - 1]);
        }
    };

    const currentStepIndex = stepOrder.indexOf(step);
    const { title, description, helper } = getStepCopy(step, email, mpinStatus);

    return (
        <div className="py-20 px-4">
            <Helmet>
                <title>Log in - RuDo Wealth</title>
                <meta
                    name="description"
                    content="Secure multi-step sign-in to access your RuDo Wealth dashboard."
                />
            </Helmet>

            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.2fr_minmax(0,_1fr)] items-start">
                <div className="space-y-6">
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Welcome back
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-bold font-['Space_Grotesk'] text-foreground">
                        Access your RuDo Wealth journey
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Complete the secure email → OTP → MPIN flow to unlock bespoke insights, portfolio recommendations, and ongoing advisory support.
                    </p>
                    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-6 text-sm text-muted-foreground">
                        <p className="font-medium text-primary mb-2">New to RuDo Wealth?</p>
                        <p>
                            Client onboarding is rolling out soon. Talk to our team via the{" "}
                            <Link href="/contact" className="text-primary underline underline-offset-4">
                                contact page
                            </Link>{" "}
                            to request early access.
                        </p>
                    </div>
                </div>

                <Card className="shadow-lg border-border/60">
                    <CardHeader className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Step {currentStepIndex + 1} of {stepOrder.length}</span>
                            {step !== "email" && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleBack}
                                    disabled={isRequestingOtp || isVerifyingOtp || isSettingMpin}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                            {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
                            {step !== "email" && (
                                <p className="text-xs text-muted-foreground">
                                    Signed in as <span className="font-medium text-foreground">{email}</span>
                                </p>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Step 1: Email */}
                        {step === "email" && (
                            <Form {...emailForm}>
                                <form
                                    onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                                    className="space-y-6"
                                >
                                    <FormField
                                        control={emailForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email address</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        inputMode="email"
                                                        autoComplete="email"
                                                        placeholder="you@example.com"
                                                        disabled={isRequestingOtp}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Button type="submit" className="w-full" disabled={isRequestingOtp}>
                                        {isRequestingOtp ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending OTP…
                                            </>
                                        ) : (
                                            "Send OTP"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        )}

                        {/* Step 2: OTP Verification */}
                        {step === "otp" && (
                            <Form {...otpForm}>
                                <form
                                    onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
                                    className="space-y-6"
                                >
                                    <FormField
                                        control={otpForm.control}
                                        name="otp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>One-time passcode</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                        maxLength={6}
                                                        placeholder="123456"
                                                        disabled={isVerifyingOtp}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-3">
                                        <Button type="submit" className="w-full" disabled={isVerifyingOtp}>
                                            {isVerifyingOtp ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Verifying…
                                                </>
                                            ) : (
                                                "Verify OTP"
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() =>
                                                email &&
                                                requestOtp(email).catch((error: unknown) =>
                                                    toast({
                                                        title: "Unable to send OTP",
                                                        description: getErrorMessage(error),
                                                        variant: "destructive",
                                                    })
                                                )
                                            }
                                            disabled={isRequestingOtp || isVerifyingOtp}
                                        >
                                            Resend OTP
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}

                        {/* Step 3: MPIN */}
                        {step === "mpin" && (
                            <Form {...mpinForm}>
                                <form
                                    onSubmit={mpinForm.handleSubmit(handleMpinSubmit)}
                                    className="space-y-6"
                                >
                                    <FormField
                                        control={mpinForm.control}
                                        name="mpin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>MPIN</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        inputMode="numeric"
                                                        autoComplete="new-password"
                                                        maxLength={4}
                                                        placeholder="••••"
                                                        disabled={isSettingMpin}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {mpinStatus === "create" && (
                                        <FormField
                                            control={mpinForm.control}
                                            name="confirmMpin"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Confirm MPIN</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="password"
                                                            inputMode="numeric"
                                                            autoComplete="new-password"
                                                            maxLength={4}
                                                            placeholder="••••"
                                                            disabled={isSettingMpin}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <Button type="submit" className="w-full" disabled={isSettingMpin}>
                                        {isSettingMpin ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Completing Login…
                                            </>
                                        ) : (
                                            "Complete Login"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        )}

                        <p className="text-xs text-muted-foreground text-center mt-8">
                            By continuing, you agree to our privacy policy and terms of service.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
