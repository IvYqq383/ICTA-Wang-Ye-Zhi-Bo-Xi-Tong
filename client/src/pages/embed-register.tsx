import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Loader2, Calendar } from "lucide-react";
import type { Webinar } from "@shared/schema";

const registrationSchema = z.object({
  name: z.string().min(2, "姓名至少需要2個字"),
  email: z.string().email("請輸入有效的 Email"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function EmbedRegister() {
  const { id } = useParams<{ id: string }>();
  const [registered, setRegistered] = useState(false);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", email: "" },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      return apiRequest("POST", "/api/registrations", {
        ...data,
        webinarId: id,
      });
    },
    onSuccess: () => {
      setRegistered(true);
      try {
        window.parent.postMessage({ type: "livecast-registered", webinarId: id }, "*");
      } catch {}
    },
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">找不到此研討會</p>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold mb-1">報名成功！</h3>
        <p className="text-sm text-muted-foreground mb-4">
          確認信已發送至您的 Email
        </p>
        <Button
          size="sm"
          onClick={() => {
            const url = `${window.location.origin}/webinar/${id}`;
            window.open(url, "_blank");
          }}
          data-testid="button-embed-enter-webinar"
        >
          進入直播間
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold" data-testid="text-embed-title">{webinar.title}</h3>
        {webinar.description && (
          <p className="text-sm text-muted-foreground mt-1">{webinar.description}</p>
        )}
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(webinar.startTime)}</span>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))}
          className="space-y-3"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">姓名</FormLabel>
                <FormControl>
                  <Input placeholder="請輸入您的姓名" {...field} data-testid="input-embed-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} data-testid="input-embed-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
            data-testid="button-embed-register"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                報名中...
              </>
            ) : (
              "立即報名"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
