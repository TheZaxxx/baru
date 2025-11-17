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

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; username: string; password: string; confirmPassword: string; referralCode?: string }) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: "Registrasi berhasil!",
        description: "Akun Anda telah dibuat. Selamat datang!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registrasi gagal",
        description: error.message || "Terjadi kesalahan saat mendaftar",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password tidak sama",
        description: "Pastikan password dan konfirmasi password sama",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      email,
      username,
      password,
      confirmPassword,
      referralCode: referralCode || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-['Poppins'] bg-gradient-to-r from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] bg-clip-text text-transparent">
            Daftar Akun
          </CardTitle>
          <CardDescription>Buat akun SydAI baru</CardDescription>
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Kode Referral (Opsional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Masukkan kode referral"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[hsl(43,96%,45%)] via-[hsl(43,96%,52%)] to-[hsl(48,95%,60%)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Loading..." : "Daftar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Sudah punya akun? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
