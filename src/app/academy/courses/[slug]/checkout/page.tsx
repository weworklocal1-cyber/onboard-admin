"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  thumbnail_url?: string;
  is_free: boolean;
  price: number;
  currency: string;
  instructor_name?: string;
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const loadRazorpay = () => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        setRazorpayLoaded(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => toast.error("Failed to load payment gateway");
      document.body.appendChild(script);
    };

    loadRazorpay();
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      const { data: courseData } = await supabase
        .from("academy_courses")
        .select("id, title, slug, description, duration_minutes, difficulty, thumbnail_url, is_free, price, currency, instructor_name")
        .eq("slug", params.slug)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/academy/login";
        return;
      }

      if (courseData.is_free) {
        router.push(`/academy/courses/${params.slug}`);
        return;
      }

      setCourse(courseData);
      setLoading(false);
    };

    fetchCourse();
  }, [supabase, params.slug, router]);

  const handlePayment = async () => {
    if (!course || !razorpayLoaded) return;

    setProcessing(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        window.location.href = "/academy/login";
        return;
      }

      const res = await fetch(`/api/academy/courses/${params.slug}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to initialize payment");
        setProcessing(false);
        return;
      }

      const razorpayKeyId = json.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKeyId) {
        toast.error("Payment gateway not configured");
        setProcessing(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(json.amount * 100),
        currency: json.currency,
        name: "WeWorkLocal Academy",
        description: course.title,
        order_id: json.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/academy/payments/verify", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyJson = await verifyRes.json();
            if (verifyRes.ok && verifyJson.success) {
              toast.success("Payment successful! Redirecting...");
              setTimeout(() => {
                router.push(`/academy/courses/${params.slug}/learn`);
              }, 1500);
            } else {
              toast.error(verifyJson.error || "Payment verification failed");
            }
          } catch {
            toast.error("Payment verification failed");
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          email: (await supabase.auth.getUser()).data.user?.email || "",
        },
        theme: {
          color: "#059669",
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch {
      toast.error("An unexpected error occurred");
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
        <p className="text-gray-500">The course you are looking for does not exist or is not available.</p>
      </div>
    );
  }

  if (Math.round((course?.price ?? 0) * 100) <= 0) {
    toast.error("Invalid course price");
    setProcessing(false);
    return;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-gray-500">Complete your purchase to access the course</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-4">
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className="w-24 h-24 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{course.description?.slice(0, 120)}...</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{course.duration_minutes} minutes</span>
                <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Course Price</span>
              <span className="font-medium">{course.currency} {course.price}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Access</span>
              <span className="font-medium">Lifetime</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Certificate</span>
              <span className="font-medium">Included</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{course.currency} {course.price}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Secure Payment</p>
              <p className="text-xs text-gray-500">Your payment is secured by Razorpay. We do not store your card details.</p>
            </div>
          </div>

          <Button
            className="w-full bg-academy-primary hover:bg-academy-secondary"
            onClick={handlePayment}
            disabled={processing || !razorpayLoaded}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : !razorpayLoaded ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Payment Gateway...
              </>
            ) : (
              <>Pay {course.currency} {course.price}</>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            By purchasing, you agree to our terms and conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
