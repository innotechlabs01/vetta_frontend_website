import { verifySmsOtpAction, resendSmsOtpAction } from "../../actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { OtpDispatchToast } from "@/components/auth/OtpDispatchToast";
import Image from "next/image";
import joel from "../../../../public/joel.png"
import logo from "../../../../public/logo.svg"
import Link from "next/link";

export default async function VerifyOtp(props: {
  searchParams: Promise<{ phone?: string, error?: string, status?: string } & Message>;
}) {
  const searchParams = await props.searchParams;
  const phone = searchParams.phone || "";
  const status = searchParams.status || "";
  const error = searchParams.error || "";


  if ("message" in searchParams && !phone) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full bg-gray-100 md:bg-white md:flex">
        <div className="hidden md:block md:w-3/5 md:p-3">
          <Image
            src={joel}
            alt="joel"
            priority
            className="h-[calc(100vh-24px)] w-full rounded-xl object-cover"
          />
        </div>
        <div className="w-full md:w-2/5 p-4 md:p-6 pt-[20svh] md:pt-6 flex items-start md:items-center justify-center">
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-sm md:shadow-none md:bg-transparent md:p-0 flex flex-col justify-center">
            <OtpDispatchToast status={status} phone={phone} />

            <form className="flex flex-col w-full items-start">

              {/* <Image src={logo} alt="Logo recompry" className="h-[30px] w-auto mb-5" /> */}

              <div className="flex gap-1 flex-col mb-3" >
                <h1 className="text-2xl font-semibold">Verificar código</h1>
                <p className="text-sm text text-foreground text-gray-600">
                  {`Hemos enviado un código de 6 dígitos a +${phone}`}

                </p>

              </div>

              <div className="flex flex-col gap-2 w-full items-center mt-6  ">
                <div className="w-full" >
                  <Label htmlFor="otp">Código de verificación</Label>
                </div>

                {/* Campo oculto para el teléfono */}
                <input type="hidden" name="phone" value={phone} />

                {/* Input para OTP */}
                <Input
                  name="otp"
                  autoFocus
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  required
                />

                <SubmitButton
                  formAction={verifySmsOtpAction}
                  pendingText="Verificando..."
                  className="mt-5 text-white bg-gray-800 w-full"
                >
                  Verificar código
                </SubmitButton>

                <FormMessage message={searchParams} />

              </div>
            </form>
            <form className="flex flex-col items-center gap-2 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
                <small>
                  No recibiste el código ?
                </small>
                <input type="hidden" name="phone" value={phone} />
                <SubmitButton
                  formAction={resendSmsOtpAction}
                  pendingText="Reenviando..."
                  variant='outline'
                  size='sm'
                >
                  Reenviar código
                </SubmitButton>
              </div>

              <p className="text-xs text-gray-500">
                ¿Este no es tu número?{" "}
                <Link href="/login" className="underline">
                  Cambiar
                </Link>
                .
              </p>

            </form>
          </div>

        </div>
      </div>
    </>
  );
}
