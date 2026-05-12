"use client";

import React, { useEffect, useRef, useState } from "react";

export interface MessageTemplate {
  title?: string;
  message: string;
  button_text?: string;
  button_secondary_text?: string;
}

export interface WhatsAppPreviewProps {
  template: MessageTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<MessageTemplate>>;
}

/** Límites */
const TITLE_MAX_CHARS = 48; // límite del título
const BTN1_MAX_CHARS = 18;  // límite del texto del botón primario
const MSG_MAX_CHARS  = 220; // límite del mensaje

export const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({
  template,
  setTemplate,
}) => {
  // Valores seguros
  const safeTitle = template.title ?? "";
  const safeMsg = template.message ?? "";
  const safeBtn1 = template.button_text ?? "";
  const safeBtn2 = template.button_secondary_text ?? "";

  // Placeholder de título
  const defaultTitle = "🎉 ¡Oferta especial disponible!";
  const displayTitle = (safeTitle.trim() !== "" ? safeTitle : defaultTitle);

  // Imagen
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => fileInputRef.current?.click();

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const onKeyPressLeft: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const effectiveBg = imageUrl ?? "/imageMedication.png";

  // -------- Textarea autosize --------
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current);
  }, []);

  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current);
  }, [safeMsg]);

  // Límite + autosize para el mensaje
  const handleChangeMsg: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const v = e.target.value.slice(0, MSG_MAX_CHARS);
    setTemplate({ ...template, message: v });
    // reflejar el valor recortado en el textarea antes de medir
    if (textareaRef.current && textareaRef.current.value !== v) {
      textareaRef.current.value = v;
    }
    if (textareaRef.current) autoResize(textareaRef.current);
  };
  // -----------------------------------

  /** ===== Botón primario: límite + centrado con SVG ===== */
  const rawBtn1 = safeBtn1.trim() || "Activar descuento";
  const isTruncated = rawBtn1.length > BTN1_MAX_CHARS;

  // Si no está truncado -> centramos icono + texto; si se trunca -> izquierda + truncate
  const shouldCenter = !isTruncated;

  const displayBtn1 = isTruncated
    ? rawBtn1.slice(0, BTN1_MAX_CHARS - 1) + "…"
    : rawBtn1;

  const btn1RowClasses =
    "w-full flex items-center px-[12px] py-[8px] gap-[8px] " +
    (shouldCenter ? "justify-center" : "justify-start");

  const btn1TextClasses =
    (shouldCenter ? "text-center" : "min-w-0 flex-1 truncate text-left") +
    " text-[#009343] text-[12px] font-inter leading-normal";

  return (
    <div className="flex gap-[30px] self-stretch items-start">
      {/* Panel izquierdo */}
      <div className="flex w-[258px] flex-col items-start gap-[12px]">
        <div className="flex items-center gap-2">
          <p className="text-[#333] font-inter text-lg font-semibold leading-normal not-italic">
            WhatsApp
          </p>
        </div>

        {/* input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />

        {/* Selector de imagen */}
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={onKeyPressLeft}
          title="Seleccionar imagen"
          className="w-[84px] h-[83px] p-[6px] pb-[8px] flex rounded-[10px] flex-col justify-center items-center gap-[3px] overflow-hidden bg-[#F2F2F2] outline-none ring-offset-2 focus:ring-2 focus:ring-[#BBAA77] cursor-pointer"
        >
          {imageUrl ? (
            <div
              className="w-full h-full rounded-[8px] bg-cover bg-center"
              style={{ backgroundImage: `url('${imageUrl}')` }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
              <g clipPath="url(#clip0_1767_1029)">
                <path d="M7.99985 5.08333C7.99985 4.39167 8.55818 3.83333 9.24985 3.83333C9.94152 3.83333 10.4998 4.39167 10.4998 5.08333C10.4998 5.775 9.94152 6.33333 9.24985 6.33333C8.55818 6.33333 7.99985 5.775 7.99985 5.08333ZM20.4998 4.66667V9.66667C20.4998 11.9667 18.6332 13.8333 16.3332 13.8333H8.83318C6.53318 13.8333 4.66651 11.9667 4.66651 9.66667V4.66667C4.66651 2.36667 6.53318 0.5 8.83318 0.5H16.3332C18.6332 0.5 20.4998 2.36667 20.4998 4.66667ZM6.33318 9.66667C6.33318 10.3083 6.57485 10.8917 6.97485 11.3417L11.3415 6.975C12.1582 6.15833 13.5832 6.15833 14.3998 6.975L15.2665 7.84167C15.4582 8.03333 15.7832 8.03333 15.9748 7.84167L18.8332 4.98333V4.66667C18.8332 3.29167 17.7082 2.16667 16.3332 2.16667H8.83318C7.45818 2.16667 6.33318 3.29167 6.33318 4.66667V9.66667ZM18.8332 9.66667V7.34167L17.1498 9.025C16.3332 9.84167 14.9082 9.84167 14.0915 9.025L13.2248 8.15833C13.0332 7.96667 12.7165 7.96667 12.5165 8.15833L8.52485 12.15C8.62485 12.1667 8.72485 12.1667 8.83318 12.1667H16.3332C17.7082 12.1667 18.8332 11.0417 18.8332 9.66667ZM15.5748 15.5333C15.1332 15.4083 14.6748 15.675 14.5498 16.1167L14.3082 17C14.1332 17.6417 13.7165 18.1833 13.1332 18.5083C12.5498 18.8417 11.8748 18.925 11.2332 18.75L3.99985 16.7667C2.66651 16.4 1.88318 15.025 2.24985 13.6917L3.04985 10.725C3.16651 10.2833 2.90818 9.825 2.46651 9.7C2.02485 9.58333 1.56651 9.84167 1.44151 10.2833L0.649848 13.2417C0.0415145 15.4583 1.34985 17.7583 3.56651 18.3667L10.7998 20.35C11.1665 20.45 11.5415 20.5 11.9082 20.5C12.6248 20.5 13.3248 20.3167 13.9665 19.95C14.9332 19.4 15.6248 18.5083 15.9248 17.4333L16.1665 16.55C16.2915 16.1083 16.0248 15.65 15.5832 15.525L15.5748 15.5333Z" fill="#666666" />
              </g>
              <defs>
                <clipPath id="clip0_1767_1029">
                  <rect width="20" height="20" fill="white" transform="translate(0.5 0.5)" />
                </clipPath>
              </defs>
            </svg>
          )}
        </div>

        {/* Campo: Título */}
        <div className="flex flex-col justify-center gap-[3px] items-start px-[8px] pt-[6px] pb-[8px] border border-[#D1D1D1] bg-[#F6F6F6] rounded-[10px] w-full">
          <div className="flex items-center w-full">
            <p className="text-[#666] font-inter text-[12px] not-italic leading-normal font-normal">
              Título
            </p>
            <span className="ml-auto text-[11px] text-[#888]">
              {safeTitle.length}/{TITLE_MAX_CHARS}
            </span>
          </div>
          <input
            type="text"
            value={safeTitle}
            maxLength={TITLE_MAX_CHARS}
            placeholder={defaultTitle}
            onChange={(e) =>
              setTemplate({
                ...template,
                title: e.target.value.slice(0, TITLE_MAX_CHARS),
              })
            }
            className="overflow-hidden text-[#333] text-ellipsis font-inter text-sm font-medium w-full bg-transparent border-none outline-none"
          />
        </div>

        {/* Campo: Mensaje */}
        <div className="flex pt-[6px] pr-[8px] pb-[8px] pl-[8px] flex-col items-start self-stretch gap-[3px] rounded-[10px] bg-[#F6F6F6] border border-[#D1D1D1]">
          <div className="flex items-center w-full">
            <p className="text-[#666] font-inter text-[12px] leading-normal font-normal not-italic">
              Mensaje
            </p>
            <span className="ml-auto text-[11px] text-[#888]">
              {safeMsg.length}/{MSG_MAX_CHARS}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={safeMsg}
            onChange={handleChangeMsg}
            maxLength={MSG_MAX_CHARS}
            className="text-[#333] font-inter text-[12px] leading-normal font-medium not-italic w-full bg-transparent border-none outline-none resize-none overflow-hidden"
            rows={1}
            placeholder="Escribe tu mensaje…"
          />
        </div>

        {/* Campo: Botón primario (límite en input) */}
        <div className="flex pt-[6px] pr-[8px] pb-[8px]  pl-[8px] flex-col self-stretch justify-center items-start rounded-[10px] border border-[#D1D1D1] bg-[#F6F6F6]">
          <p className="text-[#666] font-inter text-[12px] leading-normal font-normal not-italic">
            Botón primario
          </p>
          <input
            type="text"
            value={safeBtn1}
            maxLength={BTN1_MAX_CHARS}
            onChange={(e) => setTemplate({ ...template, button_text: e.target.value })}
            className="text-[#333] font-inter text-[12px] leading-normal font-medium not-italic w-full bg-transparent border-none outline-none"
            placeholder="Activar descuento"
          />
        </div>

        {/* Campo: Botón secundario si aplica */}
        {/* ... */}
      </div>

      {/* Preview WhatsApp */}
      <div className="flex py-[39px] px-0 justify-center items-center gap-[10px] flex-1 self-stretch bg-[#FAF6EC] rounded-[20px]">
        <div className="flex flex-col items-start gap-[5px] rounded-tr-[6px] rounded-br-[6px] rounded-bl-[6px] shadow-[0_4px_20px_0_rgba(186,169,126,0.3)] bg-[#FFF] w-[180px] relative">
          {/* Cola */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="12"
            viewBox="0 0 9 12"
            fill="none"
            className="absolute z-10"
            style={{ left: "-9px", top: "0px" }}
          >
            <path d="M1.41422 3.91422C0.154287 2.65429 1.04662 0.5 2.82843 0.5H9V11.5L1.41422 3.91422Z" fill="#FFF" />
          </svg>

          <div className="flex p-[4px] flex-col gap-[5px] items-start w-full">
            {/* Imagen */}
            <div
              className="w-[172px] h-[146px] rounded-[4px] bg-[#D9D9D9] bg-cover bg-no-repeat bg-center"
              style={{ backgroundImage: `url('${effectiveBg}')` }}
            />

            <div className="flex flex-col py-[2px] px-[4px] items-start gap-[3px] w-full">
              <div className="w-full px-[4px] min-w-0">
                <p
                  className="line-clamp-2 break-words w-full text-[#333] font-inter text-[11px] font-bold leading-[14px]"
                  title={displayTitle}
                >
                  {displayTitle}
                </p>
              </div>

              <div className="w-full px-[4px] min-w-0">
                <p
                  className="break-words whitespace-pre-line w-full text-[#333] font-inter text-[10px] font-normal leading-[14px]"
                  title={safeMsg}
                >
                  {safeMsg || " "}
                </p>
              </div>
            </div>
          </div>

          {/* Botón 1: icono + texto centrados si NO hay truncado */}
          <div className="w-full border-t border-[#DADADA]">
            <div className={btn1RowClasses}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <g clipPath="url(#clip0_1767_1007)">
                  <path d="M9 9.24999C9 10.765 7.765 12 6.25 12H2.75C1.235 12 0 10.765 0 9.24999V5.74999C0 4.23499 1.235 2.99999 2.75 2.99999C3.165 2.99999 3.5 3.33499 3.5 3.74999C3.5 4.16499 3.165 4.49999 2.75 4.49999C2.06 4.49999 1.5 5.05999 1.5 5.74999V9.24999C1.5 9.93999 2.06 10.5 2.75 10.5H6.25C6.94 10.5 7.5 9.93999 7.5 9.24999C7.5 8.83499 7.835 8.49999 8.25 8.49999C8.665 8.49999 9 8.83499 9 9.24999ZM11.5 2.52499L9.29 0.229989C9 -0.0700108 8.53 -0.0800108 8.23 0.209989C7.93 0.499989 7.92 0.969989 8.21 1.26999L9.875 2.99999H6.75C5.235 2.99999 4 4.23499 4 5.74999V8.24999C4 8.66499 4.335 8.99999 4.75 8.99999C5.165 8.99999 5.5 8.66499 5.5 8.24999V5.74999C5.5 5.05999 6.06 4.49999 6.75 4.49999H9.875L8.21 6.22999C7.925 6.52999 7.93 7.00499 8.23 7.28999C8.375 7.42999 8.565 7.49999 8.75 7.49999C8.945 7.49999 9.145 7.42499 9.29 7.26999L11.485 4.98999C12.17 4.30999 12.17 3.19499 11.495 2.52499H11.5Z" fill="#009343" />
                </g>
                <defs>
                  <clipPath id="clip0_1767_1007">
                    <rect width="12" height="12" fill="white" />
                  </clipPath>
                </defs>
              </svg>

              <span className={btn1TextClasses} title={displayBtn1}>
                {displayBtn1}
              </span>
            </div>
          </div>    

          {/* Botón 2 (si lo agregas) */}
        </div>
      </div>
    </div>
  );
};
