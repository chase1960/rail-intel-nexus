import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("注册成功，请查收邮件确认（如已关闭确认，可直接登录）");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">铁</div>
            <div>
              <h1 className="font-semibold">火车票情报中台</h1>
              <p className="text-xs text-muted-foreground">内部工作台 · 仅限授权员工登录</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">工作邮箱</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">密码</label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "处理中…" : mode === "signin" ? "登录" : "注册"}
          </Button>
        </form>
        <div className="text-xs text-center text-muted-foreground">
          {mode === "signin" ? (
            <>还没有账号？<button className="text-primary" onClick={() => setMode("signup")}>注册内部账号</button></>
          ) : (
            <>已有账号？<button className="text-primary" onClick={() => setMode("signin")}>返回登录</button></>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground border-t pt-3">
          MVP 阶段：任何已注册账号均可读写内部数据。生产环境需要按角色收敛 RLS 策略。
        </p>
      </Card>
    </div>
  );
}
