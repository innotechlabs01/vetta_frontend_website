"use server";

import { encodedRedirect } from "../utils/utils";
import { createClient } from "../utils/supabase/server";
import { getSupabaseAdmin } from "../utils/supabase/admin";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// SECURITY FIX: MOCK_USER_ID should NEVER be accessible in production
// BYPASS_OTP: Only for dev/QA to skip SMS verification
const BYPASS_OTP = process.env.NEXT_PUBLIC_BYPASS_OTP === "true";

const IS_DEV_OR_QA = process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENVIRONMENT === "qa";

const MOCK_USER_ID = BYPASS_OTP || IS_DEV_OR_QA
  ? "50205784-0c11-4c8a-8a02-6184607e2a1a"
  : null;

// Función para crear JWT manual
function createManualJWT(userId: string, email: string, jwtSecret: string, issuer: string, expiresIn: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = expiresIn === '1h' ? now + 3600 : now + 86400;

  const payload = {
    iss: issuer + "/auth/v1",
    sub: userId,
    aud: "authenticated",
    exp: exp,
    iat: now,
    email: email,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "password", timestamp: now }]
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

// Función helper para buscar usuario por teléfono (para bypass)
async function findUserIdByPhone(admin: any, phone: string): Promise<string | null> {
  // Normalizar teléfono: quitar el signo + para сравнение
  const phoneNormalized = phone.replace(/^\+/, '');

  // 1a) Busca primero en profiles
  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (profErr) {
    console.log("[bypass] Profile search error (continuing):", profErr.message);
  }

  if (prof?.user_id) {
    console.log("[bypass] Found user in profiles:", prof.user_id);
    return prof.user_id;
  }

  // 1b) Fallback a Auth con paginación completa
  console.log("[bypass] Searching in auth.users with pagination...");
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[bypass] Error listing users:", error);
      break;
    }

    // Comparar normalizando ambos lados (quitar el +)
    const match = data.users.find((u: any) => {
      const phoneInDB = (u.phone || '').replace(/^\+/, '');
      return phoneNormalized === phoneInDB;
    });

    if (match) {
      console.log("[bypass] Found user in auth.users:", match.id);
      return match.id;
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}


export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // Primero registramos al usuario con Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message); 1
    return encodedRedirect("error", "/sign-up", error.message);
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};



// Nueva acción para enviar OTP por SMS
export const signInAction = async (formData: FormData) => {
  const countryCodeRaw = formData.get("countryCode") as string;
  const phoneNumberRaw = formData.get("phoneNumber") as string;
  const supabase = await createClient();

  // Validaciones tempranas con redirect FUERA de try/catch
  if (!countryCodeRaw || !phoneNumberRaw) {
    console.error("[auth:sms] Missing countryCode or phoneNumber");
    return redirect(`/login?type=error&message=${encodeURIComponent("Código de país y número de teléfono son requeridos")}`);
  }

  const normalizedCountryCode = countryCodeRaw.trim().startsWith("+")
    ? countryCodeRaw.trim()
    : `+${countryCodeRaw.trim().replace(/\D/g, "")}`;
  const normalizedPhoneNumber = phoneNumberRaw.trim().replace(/\D/g, "");

  if (!normalizedPhoneNumber) {
    console.error("[auth:sms] Invalid normalized phone number", {
      countryCode: normalizedCountryCode,
      rawPhone: phoneNumberRaw,
    });
    return redirect(`/login?type=error&message=${encodeURIComponent("Número de teléfono inválido")}`);
  }

  // Formato E.164 esperado por proveedores como Twilio Verify
  const fullPhoneNumber = `${normalizedCountryCode}${normalizedPhoneNumber}`;

  if (BYPASS_OTP) {
    const phoneForRedirect = fullPhoneNumber.startsWith('+') ? fullPhoneNumber.substring(1) : fullPhoneNumber;
    return redirect(`/verify-otp?phone=${encodeURIComponent(phoneForRedirect)}&status=otp_sent`);
  }

  // Enviar OTP
  const { error } = await supabase.auth.signInWithOtp({
    phone: fullPhoneNumber,
    options: {
      shouldCreateUser: true,
      data: {
        phone: fullPhoneNumber,
      }
    }
  });

  // Manejar errores específicos
  if (error) {
    console.error("[auth:sms] Error sending SMS OTP", {
      phone: fullPhoneNumber,
      error: error.message,
    });
    return redirect(`/login?type=error&message=${encodeURIComponent(error.message)}`);
  }

  console.info("[auth:sms] OTP sent successfully", { phone: fullPhoneNumber });
  const phoneForRedirect = fullPhoneNumber.startsWith('+') ? fullPhoneNumber.substring(1) : fullPhoneNumber;
  return redirect(`/verify-otp?phone=${encodeURIComponent(phoneForRedirect)}&status=otp_sent`);

};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
};

// Mantener las acciones de email OTP por si las necesitas
export async function sendOtpAction(formData: FormData): Promise<any> {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  if (!email) {
    return {
      type: "error",
      message: "Email is required",
    };
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      type: "error",
      message: "Please enter a valid email address",
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // El usuario será creado automáticamente si no existe
        shouldCreateUser: true,
        // Opcional: configurar datos adicionales para el usuario
        data: {
          // Puedes agregar metadatos aquí si los necesitas
        }
      }
    });

    if (error) {
      console.error("Error sending OTP:", error);
      return {
        type: "error",
        message: error.message,
      };
    }

    return {
      type: "success",
      message: "Check your email for the verification code",
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      type: "error",
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

// Nueva acción para verificar OTP de SMS
export async function verifySmsOtpAction(formData: FormData): Promise<any> {
  const phone = (formData.get("phone") as string) ?? "";
  const token = ((formData.get("otp") as string) ?? "").trim();
  const supabase = await createClient();

  // Validaciones tempranas
  if (!phone || !token) {
    return {
      type: "error",
      message: "Número de teléfono y código de verificación son requeridos",
    };
  }

  if (token.length !== 6) {
    return {
      type: "error",
      message: "El código de verificación debe tener 6 dígitos",
    };
  }

  // Asegurar que el teléfono tenga el formato correcto con +
  const normalizedPhone = phone.trim();
  const fullPhoneNumber = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone.replace(/\D/g, "")}`;

  // BYPASS: En modo desarrollo/QA - crear sesión sin validar OTP
  if (BYPASS_OTP || IS_DEV_OR_QA) {
    try {
      const admin = getSupabaseAdmin();
      const supabase = await createClient();

      console.log("[bypass] Starting bypass flow for phone:", fullPhoneNumber);

      // 1. Intentar crear usuario primero
      const tempEmail = `user_${Date.now()}@test.local`;

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        phone: fullPhoneNumber,
        email: tempEmail,
        user_metadata: {
          phone: fullPhoneNumber,
          first_name: 'Test',
          last_name: 'User'
        },
        email_confirm: true,
        phone_confirm: true,
      });

      let userId: string;

      console.log(`newUser: ${newUser}, createError: ${createError}`)

      if (createError) {
        // Si el teléfono ya existe, buscar el usuario
        console.log("[bypass] User exists, finding by phone...");

        const foundUserId = await findUserIdByPhone(admin, fullPhoneNumber);

        if (!foundUserId) {
          console.error("[bypass] User not found with phone:", fullPhoneNumber);
          return redirect("/login?type=error&message=Usuario no encontrado");
        }

        userId = foundUserId;
        console.log("[bypass] Found user:", userId);
      } else if (newUser?.user) {
        userId = newUser.user.id;
        console.log("[bypass] Created user:", userId);
      } else {
        return redirect("/login?type=error&message=Error al crear usuario");
      }

      // 2. Generar tokens JWT manualmente
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!jwtSecret || !supabaseUrl) {
        console.error("[bypass] Missing JWT_SECRET or SUPABASE_URL");
        return redirect("/login?type=error&message=Configuración faltante: SUPABASE_JWT_SECRET");
      }

      // Generar JWT manualmente
      const accessToken = createManualJWT(userId, tempEmail, jwtSecret, supabaseUrl, '1h');
      const refreshToken = `manual_refresh_${userId}_${Date.now()}`;

      console.log("[bypass] Setting session with manual tokens...");

      // 3. Establecer sesión
      const { error: setError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setError) {
        console.error("[bypass] Set session error:", setError);
        return redirect("/login?type=error&message=Error al establecer sesión");
      }

      console.log("[bypass] Session created successfully! Redirecting to /org/select");

      // Forzar la redirección de forma segura
      return Response.redirect(new URL("/org/select", process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"));

    } catch (err) {
      console.error("[bypass] Error:", err);
      return redirect("/login?type=error&message=Error en bypass");
    }
  }

  // Flujo normal: verificar OTP realmente

  // Verificar OTP (flujo normal para producción)
  const { data, error } = await supabase.auth.verifyOtp({
    phone: fullPhoneNumber,
    token,
    type: 'sms'
  });

  if (error) {
    const msg = error.message.includes('expired')
      ? "El código ha expirado. Solicita uno nuevo."
      : "Código inválido. Verifica e intenta de nuevo.";
    return redirect(
      `/verify-otp?phone=${encodeURIComponent(phone)}&type=error&message=${encodeURIComponent(msg)}`
    );
  }

  if (!data.user) {
    return {
      type: "error",
      message: "Verificación fallida. Por favor intenta de nuevo.",
    };
  }

  // Crear o actualizar perfil con información del teléfono
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      user_id: data.user.id,
      phone: fullPhoneNumber,
      email: data.user.email,
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (profileError) {
    console.error("Error creating/updating profile:", profileError.message);
    // No retornamos error porque el usuario ya está autenticado
  }

  // Redirigir a /org/select para que elija la organización
  redirect("/org/select");
}

// Acción para reenviar OTP por SMS
export async function resendSmsOtpAction(formData: FormData): Promise<any> {
  const phone = (formData.get("phone") as string) ?? "";
  const supabase = await createClient();

  if (!phone.trim()) {
    console.error("[auth:sms] Missing phone in resendSmsOtpAction");
    return {
      type: "error",
      message: "Número de teléfono es requerido",
    };
  }

  const normalizedPhone = phone.trim();
  const fullPhoneNumber = normalizedPhone.startsWith("+")
    ? normalizedPhone
    : `+${normalizedPhone.replace(/\D/g, "")}`;

  if (BYPASS_OTP) {
    return redirect(
      `/verify-otp?phone=${encodeURIComponent(phone)}&status=otp_resent`
    );
  }

  // Llamada a Supabase sin try/catch
  const { error } = await supabase.auth.signInWithOtp({
    phone: fullPhoneNumber,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("[auth:sms] Error resending SMS OTP", {
      phone: fullPhoneNumber,
      error: error.message,
    });
    return {
      type: "error",
      message: error.message,
    };
  }

  console.info("[auth:sms] OTP resent successfully", { phone: fullPhoneNumber });
  // Redirect siempre ocurre aquí, fuera de cualquier bloque de error
  return redirect(
    `/verify-otp?phone=${encodeURIComponent(phone)}&status=otp_resent`
  );
}

export async function verifyOtpAction(formData: FormData): Promise<any> {
  const email = formData.get("email") as string;
  const token = formData.get("otp") as string;
  const supabase = await createClient();

  if (!email || !token) {
    return {
      type: "error",
      message: "Email and verification code are required",
    };
  }

  if (token.length !== 6) {
    return {
      type: "error",
      message: "Verification code must be 6 digits",
    };
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email' // Especificar que es un OTP de email
    });

    if (error) {
      console.error("Error verifying OTP:", error);

      // Manejar errores específicos
      if (error.message.includes('expired')) {
        return {
          type: "error",
          message: "Verification code has expired. Please request a new one.",
        };
      } else if (error.message.includes('invalid')) {
        return {
          type: "error",
          message: "Invalid verification code. Please check and try again.",
        };
      }

      return {
        type: "error",
        message: error.message,
      };
    }

    if (data.user) {
      // Usuario verificado y creado/autenticado exitosamente

      // Opcional: Puedes actualizar el perfil del usuario aquí si es necesario
      // await supabase.from('profiles').upsert({
      //   id: data.user.id,
      //   email: data.user.email,
      //   created_at: new Date().toISOString(),
      // });

      // Redirigir a /org/select para que elija la organización
      return redirect("/org/select");
    }

    return {
      type: "error",
      message: "Verification failed. Please try again.",
    };
  } catch (error) {
    console.error("Unexpected error during verification:", error);
    return {
      type: "error",
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

// Opcional: Acción para reenviar OTP
export async function resendOtpAction(formData: FormData): Promise<any> {
  const email = formData.get("email") as string;

  if (!email) {
    return {
      type: "error",
      message: "Email is required",
    };
  }

  // Reutilizar la lógica de sendOtpAction
  return await sendOtpAction(formData);
}

export async function createOrgAction(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get('name') || 'Mi negocio');
  const slug = String(formData.get('slug') || '');

  // llama a tu RPC con el nombre de parámetro correcto
  const { data, error } = await supabase.rpc('create_default_org', {
    p_org_name: name,
    p_slug: slug,              // <-- coincide con tu SQL (p_slug)
  });
  if (error) {
    throw new Error(error.message);
  }

  const orgId = data as string;

  const c = cookies();         // cookies() es síncrono en Server Actions
  c.set('org_id', orgId, { path: '/', httpOnly: false });

  redirect('/home');           // o a donde quieras
}

export async function setOrgAction(formData: FormData) {

  const orgId = String(formData.get("org_id") || "");
  const next = String(formData.get("next") || "/home");
  if (!orgId) throw new Error("org_id requerido");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const effectiveUserId = user?.id ?? (BYPASS_OTP ? MOCK_USER_ID : null);

  if ((userError && !BYPASS_OTP) || !effectiveUserId) {
    throw new Error("Sesión inválida. Inicia sesión de nuevo.");
  }

  // seguridad: verificar membresía del usuario actual
  const membershipClient = user ? supabase : getSupabaseAdmin();
  const { data: membership } = await membershipClient
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", orgId)
    .eq("user_id", effectiveUserId)
    .limit(1);

  if (!membership?.length) throw new Error("No eres miembro de esa negocio");

  const c = await cookies();
  c.set("org_id", orgId, { path: "/", httpOnly: false });

  redirect(next);
}

export async function upsertOrgSettingsAction(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id") || "");
  const currency = formData.get("currency") ? String(formData.get("currency")) : null;
  const timezone = formData.get("timezone") ? String(formData.get("timezone")) : null;
  const brand_banner_url = formData.get("brand_banner_url") ? String(formData.get("brand_banner_url")) : null;
  const brand_logo_url = formData.get("brand_logo_url") ? String(formData.get("brand_logo_url")) : null;
  const brand_description = formData.get("brand_description") ? String(formData.get("brand_description")) : null;

  const billing_address = safeJson(formData.get("billing_address"));
  const brand_colors = safeJson(formData.get("brand_colors"));
  const social_links = safeJson(formData.get("social_links"));

  if (!organization_id) throw new Error("organization_id requerido");

  const { error } = await supabase
    .from("organizations")
    .upsert(
      {
        organization_id,
        billing_address,
        currency,
        timezone,
        brand_banner_url,
        brand_logo_url,
        brand_description,
        brand_colors,
        social_links,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );

  if (error) throw error;

  // refresca la página actual
  revalidatePath("/org");
}

function safeJson(v: FormDataEntryValue | null) {
  if (!v) return null;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

import { z } from "zod";

const schema = z.object({
  organizationId: z.string().uuid(),
  phone: z.string().min(5),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["owner", "admin", "manager", "member"]),
  locationIds: z.array(z.string().uuid()).optional(), // requerido si rol no es owner/admin
});

export async function createOrgUserAction(input: unknown) {
  const parsed = schema.parse(input);
  const {
    organizationId, phone, firstName, lastName, role, locationIds = [],
  } = parsed;

  const supa = getSupabaseAdmin();

  // ---------------- 1) Buscar o crear usuario Auth (por phone) ----------------
  async function findUserIdByPhone(phone: string): Promise<string | null> {
    // 1a) Busca primero en profiles (rápido y directo si guardas phone allí)
    const { data: prof, error: profErr } = await supa
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (profErr) throw profErr;
    if (prof?.user_id) return prof.user_id;

    // 1b) Fallback a Auth (escaneo paginado)
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const match = data.users.find(u => u.phone === phone);
      if (match) return match.id;
      if (data.users.length < perPage) break;
      page += 1;
    }
    return null;
  }

  // A) obtener o crear Auth user
  let userId = await findUserIdByPhone(phone);
  if (!userId) {
    const { data: created, error: authErr } = await supa.auth.admin.createUser({
      phone,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (authErr) throw authErr;
    userId = created.user.id;
  } else {
    // (Opcional) sincroniza metadatos si lo deseas
    await supa.auth.admin.updateUserById(userId, {
      user_metadata: { first_name: firstName, last_name: lastName },
    });
  }

  // ---------------- 2) Profile: insertar solo si NO existe ----------------
  const { data: existingProfile, error: profileCheckErr } = await supa
    .from("profiles")
    .select("user_id, full_name, phone")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileCheckErr) throw profileCheckErr;

  if (!existingProfile) {
    // Si tuviste RLS aquí, asegúrate de que getSupabaseAdmin use SERVICE_ROLE
    // o crea una policy específica para inserts desde el servicio.
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim() || null;
    const { error: profileInsErr } = await supa.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      phone,
    });
    if (profileInsErr) throw profileInsErr;
  }
  // Si existe, NO tocamos (para evitar violar policies o sobrescribir datos).

  // ---------------- 3) Organization member: crear solo si NO existe ----------------
  const { data: existingMember, error: omCheckErr } = await supa
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (omCheckErr) throw omCheckErr;

  if (!existingMember) {
    const { error: omInsErr } = await supa
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: userId, role });
    if (omInsErr) throw omInsErr;
  } else if (existingMember.role !== role) {
    // (Opcional) actualizar rol si cambió
    const { error: omUpdErr } = await supa
      .from("organization_members")
      .update({ role })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    if (omUpdErr) throw omUpdErr;
  }

  // ---------------- 4) Location members: insertar SOLO los que falten ----------------
  if (!["owner", "admin"].includes(role)) {
    if (!locationIds.length) {
      throw new Error("Selecciona al menos una sucursal para este rol.");
    }

    // Obtener los ya existentes para no reinsertar
    const { data: existingLocs, error: lmCheckErr } = await supa
      .from("location_members")
      .select("location_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    if (lmCheckErr) throw lmCheckErr;

    const already = new Set((existingLocs ?? []).map(r => r.location_id));
    const toInsert = locationIds
      .filter((locId: string) => !already.has(locId))
      .map((locId: string) => ({
        organization_id: organizationId,
        location_id: locId,
        user_id: userId,
      }));

    if (toInsert.length > 0) {
      const { error: lmInsErr } = await supa.from("location_members").insert(toInsert);
      if (lmInsErr) throw lmInsErr;
    }
  }

  return { ok: true, userId };
}


// Enhanced server action with better validation
export async function updateOrganizationSlugAction(formData: FormData) {
  const supabase = await createClient();
  const organizationId = String(formData.get("organization_id") || "");
  const newSlug = String(formData.get("slug") || "").toLowerCase().trim();

  if (!organizationId || !newSlug) {
    throw new Error("ID de organización y slug son requeridos");
  }

  // Enhanced validation
  if (!isValidSlugFormat(newSlug)) {
    throw new Error("El slug debe tener 3-40 caracteres, solo letras minúsculas, números y guiones. No puede comenzar o terminar con guión.");
  }

  // Check for reserved slugs
  if (isReservedSlug(newSlug)) {
    throw new Error("Este slug está reservado y no puede ser usado");
  }

  // Verify current user has permission to update this organization
  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .single();

  if (!orgMember || !["owner", "admin"].includes(orgMember.role)) {
    throw new Error("No tienes permisos para actualizar esta organización");
  }

  // Check if slug already exists (excluding current organization)
  const { data: existing, error: checkError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", newSlug)
    .neq("id", organizationId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking slug availability:", checkError);
    throw new Error("Error verificando disponibilidad del slug");
  }

  if (existing) {
    throw new Error(`El slug "${newSlug}" ya está en uso por otra organización`);
  }

  // Update the organization
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      slug: newSlug,
      updated_at: new Date().toISOString()
    })
    .eq("id", organizationId);

  if (updateError) {
    console.error("Error updating organization:", updateError);

    // Handle specific database constraint violations
    if (updateError.code === '23505' && updateError.message.includes('organizations_slug_key')) {
      throw new Error(`El slug "${newSlug}" ya está en uso`);
    }

    throw new Error("Error actualizando la organización");
  }

  // Revalidate the page to reflect changes
  revalidatePath("/online");

  return { success: true, slug: newSlug };
}

// Validation helper functions (same as in hook)
function isValidSlugFormat(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;

  const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
  const hasConsecutiveHyphens = /--/.test(slug);
  const startsOrEndsWithHyphen = /^-|-$/.test(slug);

  return (
    slugPattern.test(slug) &&
    !hasConsecutiveHyphens &&
    !startsOrEndsWithHyphen
  );
}

const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop',
  'store', 'support', 'help', 'about', 'contact', 'terms',
  'privacy', 'legal', 'security', 'cdn', 'static', 'assets',
  'public', 'private', 'system', 'root', 'null', 'undefined'
];

function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

function isValidSlug(s: string) {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s);
}

const toISOStringOrNull = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};


export async function getLoyaltyRewardsAction(orgId: string) {
  const supabase = await createClient();

  const now = new Date().toISOString();

  await supabase
    .from("loyalty_rewards")
    .update({
      is_active: false,
      updated_at: now
    })
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .not("valid_until", "is", null)
    .lt("valid_until", now);

  const { data, error } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });


  if (error) {
    console.error("Error completo:", JSON.stringify(error, null, 2));
    throw new Error("Error al cargar las recompensas");
  }

  return (data || []).map((reward) => {
    const normalizedCondition =
      reward.condition_type ?? reward.reward_type ?? null;

    return {
      ...reward,
      condition_type: normalizedCondition,
      reward_type: reward.reward_type ?? normalizedCondition,
      special_event_type: reward.special_event_type ?? null,
      special_range_start: reward.special_range_start ?? null,
      special_range_end: reward.special_range_end ?? null,
    };
  });
}

export async function createLoyaltyRewardAction(formData: FormData) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_id")?.value;

  if (!orgId) {
    throw new Error("No hay organización seleccionada");
  }

  // ============ PROCESAR FREE PRODUCTS ============
  const freeProductsIdsString = formData.get("free_products_ids");
  let free_products_ids = null;


  if (freeProductsIdsString) {
    try {
      const parsed = JSON.parse(String(freeProductsIdsString));

      // Solo asignar si es array válido con elementos
      free_products_ids = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;

    } catch (e) {
      console.error("❌ Error parsing free_products_ids:", e);
      free_products_ids = null;
    }
  }

  const free_products_quantity = formData.get("free_products_quantity")
    ? parseInt(String(formData.get("free_products_quantity")))
    : 1;

  // ============ PROCESAR PRODUCT IDS (CONDICIÓN) ============
  const productIdsString = formData.get("product_ids");
  let product_ids = null;

  if (productIdsString) {
    try {
      const parsed = JSON.parse(String(productIdsString));
      product_ids = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch (e) {
      console.error("Error parsing product_ids:", e);
      product_ids = null;
    }
  }

  // ============ EXTRAER DATOS BÁSICOS ============
  const name = String(formData.get("name") || "");
  const description = String(formData.get("description") || "");
  const points_cost = 0; // O el valor que uses para puntos

  // ============ PROCESAR IMAGEN ============
  let image_url = formData.get("image_url") ? String(formData.get("image_url")) : null;
  const imageFile = formData.get("image_file") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('loyalty-images')
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      throw new Error("Error al subir la imagen");
    }

    const { data: publicUrlData } = await supabase.storage
      .from('loyalty-images')
      .getPublicUrl(fileName);

    if (publicUrlData?.publicUrl) {
      image_url = publicUrlData.publicUrl;
    }
  }

  // ============ CONDICIÓN ============
  const condition_type = String(formData.get("condition_type") || "");
  const isSpecialDates = condition_type === "specialDates";
  const special_event_type_raw = formData.get("special_event_type");
  const special_event_type =
    isSpecialDates && special_event_type_raw
      ? String(special_event_type_raw)
      : null;
  const shouldStoreRange =
    isSpecialDates && special_event_type === "range";
  const special_range_start = shouldStoreRange
    ? toISOStringOrNull(formData.get("special_range_start"))
    : null;
  const special_range_end = shouldStoreRange
    ? toISOStringOrNull(formData.get("special_range_end"))
    : null;
  const minimum_amount = formData.get("minimum_amount")
    ? parseFloat(String(formData.get("minimum_amount")))
    : null;
  const minimum_quantity = formData.get("minimum_quantity")
    ? parseInt(String(formData.get("minimum_quantity")))
    : null;

  // ============ BENEFICIO ============
  const benefit_type = String(formData.get("benefit_type") || "");
  const benefit_value = formData.get("benefit_value")
    ? parseFloat(String(formData.get("benefit_value")))
    : null;
  const product_id = formData.get("product_id")
    ? String(formData.get("product_id"))
    : null;

  // ============ ALCANCE Y LÍMITES ============
  const user_limit = formData.get("user_limit")
    ? parseInt(String(formData.get("user_limit")))
    : null;
  const total_limit = formData.get("total_limit")
    ? parseInt(String(formData.get("total_limit")))
    : null;
  const valid_until = formData.get("valid_until")
    ? String(formData.get("valid_until"))
    : null;


  // ============ INSERTAR EN DB ============
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      organization_id: orgId,
      name,
      description,
      points_cost,
      reward_type: condition_type || null,
      condition_type: condition_type || null,
      special_event_type,
      special_range_start,
      special_range_end,
      minimum_amount,
      minimum_quantity,
      benefit_type,
      benefit_value,
      product_id,
      product_ids,
      free_products_ids,
      free_products_quantity: free_products_ids ? free_products_quantity : null,
      user_limit,
      total_limit,
      valid_until,
      image_url,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Error creating reward:", error);
    throw new Error("Error al crear la recompensa");
  }


  revalidatePath("/loyalty");
  return data;
}


export async function updateLoyaltyRewardAction(formData: FormData) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("org_id")?.value;

  if (!orgId) {
    throw new Error("No hay organización seleccionada");
  }



  const rewardId = String(formData.get("reward_id") || "");
  if (!rewardId) {
    throw new Error("ID de recompensa requerido");
  }

  // PASO 1: Verificar que la recompensa existe y pertenece a esta organización
  const { data: existingReward, error: checkError } = await supabase
    .from("loyalty_rewards")
    .select("id, organization_id")
    .eq("id", rewardId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking reward:", checkError);
    throw new Error("Error verificando la recompensa");
  }

  if (!existingReward) {
    throw new Error("La recompensa no existe");
  }

  if (existingReward.organization_id !== orgId) {
    throw new Error("No tienes permisos para editar esta recompensa");
  }

  // Extraer datos del formulario
  const name = String(formData.get("name") || "");
  const description = String(formData.get("description") || "");
  const is_active = formData.get("is_active") === "true";

  // Procesar imagen si existe
  let image_url = formData.get("existing_image_url") ? String(formData.get("existing_image_url")) : null;
  const imageFile = formData.get("image_file") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('loyalty-images')
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      throw new Error("Error al subir la imagen");
    }

    const { data: urlData } = await supabase.storage
      .from('loyalty-images')
      .createSignedUrl(fileName, 3660);

    if (urlData?.signedUrl) {
      image_url = urlData.signedUrl;
    }
  }

  // Condición
  const condition_type = String(formData.get("condition_type") || "");
  const isSpecialDates = condition_type === "specialDates";
  const special_event_type_raw = formData.get("special_event_type");
  const special_event_type =
    isSpecialDates && special_event_type_raw
      ? String(special_event_type_raw)
      : null;
  const shouldStoreRange =
    isSpecialDates && special_event_type === "range";
  const special_range_start = shouldStoreRange
    ? toISOStringOrNull(formData.get("special_range_start"))
    : null;
  const special_range_end = shouldStoreRange
    ? toISOStringOrNull(formData.get("special_range_end"))
    : null;
  const minimum_amount = formData.get("minimum_amount")
    ? parseFloat(String(formData.get("minimum_amount")))
    : null;
  const minimum_quantity = formData.get("minimum_quantity")
    ? parseInt(String(formData.get("minimum_quantity")))
    : null;

  // Beneficio
  const benefit_type = String(formData.get("benefit_type") || "");
  const benefit_value = formData.get("benefit_value")
    ? parseFloat(String(formData.get("benefit_value")))
    : null;
  const product_id = formData.get("product_id")
    ? String(formData.get("product_id"))
    : null;

  // Alcance y límites
  const user_limit = formData.get("user_limit")
    ? parseInt(String(formData.get("user_limit")))
    : null;
  const total_limit = formData.get("total_limit")
    ? parseInt(String(formData.get("total_limit")))
    : null;
  const valid_until = formData.get("valid_until")
    ? String(formData.get("valid_until"))
    : null;

  // PASO 2: Actualizar solo con el ID (sin filtro de organization_id para evitar el error)
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .update({
      name,
      description,
      reward_type: condition_type || null,
      condition_type: condition_type || null,
      special_event_type,
      special_range_start,
      special_range_end,
      minimum_amount,
      minimum_quantity,
      benefit_type,
      benefit_value,
      product_id,
      user_limit,
      total_limit,
      valid_until,
      image_url,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .select()
    .single();

  if (error) {
    console.error("Error updating reward:", error);
    throw new Error("Error al actualizar la recompensa");
  }

  revalidatePath("/loyalty");
  return data;
}

export async function createDriverAction(
  input: {
    organization_id: string;
    name: string;
    phone?: string;
    location_id?: string;
    vehicle_type?: string;
    vehicle_plate?: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    is_active?: boolean;
    status?: string;
    max_simultaneous_orders?: number;
  },
  commission?: {
    commission_type: string;
    commission_value: number;
  }
) {
  const supabase = getSupabaseAdmin();

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .insert({
      ...input,
      max_simultaneous_orders: input.max_simultaneous_orders || 1,
    })
    .select()
    .single();

  if (driverError) {
    console.error("Error creating driver:", driverError);
    throw new Error(driverError.message);
  }

  if (commission) {
    const { error: commissionError } = await supabase
      .from("driver_commissions")
      .insert({
        driver_id: driver.id,
        commission_type: commission.commission_type,
        commission_value: commission.commission_value,
      });

    if (commissionError) {
      console.error("Error creating commission:", commissionError);
      throw new Error(commissionError.message);
    }
  }

  revalidatePath("/settings/drivers");
  return driver;
}
