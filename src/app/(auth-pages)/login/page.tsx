import { signInAction } from "../../actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Label } from "../../../components/ui/label";
import { PhoneLoginFields } from "@/components/auth/PhoneLoginFields";
import { AuthQueryToast } from "@/components/auth/AuthQueryToast";
import Link from "next/link";
import Image from "next/image";
import joel from "../../../../public/joel.png"
import logo from "../../../../public/logo.svg"

export default async function Signup(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const typedMessage = (searchParams.type || "").toLowerCase();
  const rawMessage = searchParams.message;
  const normalizedMessage: Message | null = searchParams.error
    ? { error: searchParams.error }
    : searchParams.success
      ? { success: searchParams.success }
      : typedMessage === "error" && rawMessage
        ? { error: rawMessage }
        : typedMessage === "success" && rawMessage
          ? { success: rawMessage }
          : rawMessage
            ? { message: rawMessage }
            : null;

  if (
    normalizedMessage &&
    "message" in normalizedMessage &&
    !typedMessage &&
    !searchParams.error &&
    !searchParams.success
  ) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={normalizedMessage} />
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
          <form className="w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-sm md:shadow-none md:bg-transparent md:p-0 flex flex-col items-start">
            <AuthQueryToast
              type={searchParams.type}
              message={searchParams.message}
              error={searchParams.error}
              success={searchParams.success}
            />
            
            <Image src={logo} alt="Logo recompry" className="h-[30px] w-auto mb-5" />

            <div className="flex gap-1 flex-col mb-3 w-full" >
                
              <h1 className="text-2xl font-semibold">¡Bienvenid@!</h1>
              
              <p className="text-sm text text-foreground text-gray-600">
                {"Conecta con clientes e impulsa ventas recurrentes."}
              </p>
              
            </div>

            <div className="flex flex-col gap-2 w-full items-center mt-8">
              <div className="w-full" >
                <Label htmlFor="phone">Número de teléfono</Label>
              </div>
              
              <PhoneLoginFields />
              
              <SubmitButton 
                formAction={signInAction} 
                pendingText="Enviando código..." 
                className="mt-5 text-white bg-gray-800 w-full"
              >
                Continuar
              </SubmitButton>
              
              {normalizedMessage ? <FormMessage message={normalizedMessage} /> : null}
              
              <p className="text-xs text-center text-gray-500 mt-2">
                Al continuar, recibirás un SMS con un código de acceso. Si ya tienes cuenta, iniciarás sesión; si no, se creará tu perfil automáticamente.
              </p>
              
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
