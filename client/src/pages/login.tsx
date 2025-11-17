import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      toast({
        title: "Login berhasil!",
        description: "Selamat datang kembali!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login gagal",
        description: error.message || "Email atau password salah",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-['Poppins'] bg-gradient-to-r from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription>Login ke akun SydAI Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Loading..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Belum punya akun? </span>
            <Link href="/register" className="text-primary hover:underline font-medium">
              Daftar sekarang
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
