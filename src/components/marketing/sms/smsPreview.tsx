import React from "react";

export interface SmsPreviewProps {
  /** Mensaje de SMS (estado independiente de WhatsApp) */
  message: string;
  /** Setter del mensaje de SMS */
  setMessage: (value: string) => void;
}

/** Límite de caracteres del SMS */
const SMS_MAX_CHARS = 160;

const SmsPreview: React.FC<SmsPreviewProps> = ({ message, setMessage }) => {
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const v = e.target.value.slice(0, SMS_MAX_CHARS);
    setMessage(v);
  };

  return (
    <div className="flex items-start gap-[30px] self-stretch">
      {/* Panel izquierdo: editor */}
      <div className="flex w-[258px] flex-col items-start gap-[12px]">
        <div className="flex items-center gap-2">
          <p className="text-[#333] font-inter text-lg font-semibold leading-normal">SMS</p>
        </div>

        <div className="flex flex-col gap-[3px] self-stretch pt-[6px] pr-2 pb-2 pl-2 border border-[#D1D1D1] bg-[#F6F6F6] rounded-[10px]">
          <div className="flex items-center w-full">
            <p className="text-[#666] font-inter text-[12px] font-normal leading-normal">
              Mensaje
            </p>
            <span className="ml-auto text-[11px] text-[#888]">
              {message.length}/{SMS_MAX_CHARS}
            </span>
          </div>
          <textarea
            value={message}
            onChange={handleChange}
            maxLength={SMS_MAX_CHARS}
            className="text-[#333] font-inter text-sm font-medium leading-normal w-full bg-transparent border-none outline-none resize-none"
            rows={3}
            placeholder="Escribe tu mensaje…"
            aria-label="Mensaje de SMS"
          />
        </div>
      </div>

      {/* Panel derecho: preview que crece hacia abajo */}
      <div className="relative flex py-[39px] px-0 justify-center items-start gap-2.5 flex-1 self-stretch bg-[#ECF7FA] rounded-[20px] overflow-y-auto">
        {/* Cola del bocadillo */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="9"
          height="11"
          viewBox="0 0 9 11"
          fill="none"
          className="absolute left-[168px] top-[52px] text-white"
        >
          <path
            d="M1.41422 3.41422C0.154287 2.15429 1.04662 0 2.82843 0H9V11L1.41422 3.41422Z"
            fill="currentColor"
          />
        </svg>

        {/* Globo del mensaje: crece hasta 320px y luego scroll interno */}
        <div className="flex p-[6px] w-[181px] flex-col items-start gap-[5px] bg-[#FFFFFF] shadow-[0_4px_20px_0_rgba(126,163,186,0.30)] rounded-tr-[6px] rounded-br-[6px] rounded-bl-[6px] max-h-[320px] overflow-y-auto">
          <div className="flex flex-col w-[169px]">
            <p className="text-[#333] font-inter text-xs font-normal leading-normal whitespace-pre-wrap break-words">
              {message}{" "}
              <span className="text-[#1265F7] font-inter text-xs font-medium leading-normal break-all">
                https://eva.link
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsPreview;
