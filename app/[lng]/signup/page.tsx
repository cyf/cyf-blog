"use client";
import React, { createRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Cropper from "react-cropper";
import EmailValidator from "email-validator";
import Zoom from "react-medium-image-zoom";
import Cookies from "js-cookie";
import { AiOutlineCloudUpload } from "react-icons/ai";
import AwesomeDebouncePromise from "awesome-debounce-promise";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAgreementDialog } from "@/components/home/agreement-dialog";
import Legal from "@/components/home/legal";
import Or from "@/components/home/or";
import PageHeader from "@/components/home/page-header";
import ThirdPartyAccount from "@/components/home/third-party-account";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  FileInput,
  Button,
} from "muse-ui";
import { domain, cacheTokenKey, cacheIdKey } from "@/constants";
import { authService, userService } from "@/services";
import { setUser } from "@/model/slices/user/slice";
import { useAppDispatch } from "@/model/hooks";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

import type { ReactCropperElement } from "react-cropper";
import type { IBlob } from "@/utils/image";

import "cropperjs/dist/cropper.css";
import "react-medium-image-zoom/dist/styles.css";

const hasUsernameAsync = async (username: string) => {
  try {
    const res = await userService.hasUsername(username);
    return res?.data || false;
  } catch (e) {
    console.error(e);
  }
  return true;
};

const debounceUsername = AwesomeDebouncePromise(hasUsernameAsync, 500);

const hasEmailAsync = async (email: string) => {
  try {
    const res = await userService.hasEmail(email);
    console.log(res);
    return res?.data || false;
  } catch (e) {
    console.error(e);
  }
  return true;
};

const debounceEmail = AwesomeDebouncePromise(hasEmailAsync, 500);

const formSchema = z
  .object({
    file: z.any(),
    username: z.string().min(6, {
      message: "username-validator",
    }),
    nickname: z.string(),
    email: z.string().email({ message: "email-validator" }),
    password: z.string().min(6, {
      message: "password-validator",
    }),
    "repeat-password": z.string().min(6, {
      message: "password-validator",
    }),
  })
  .refine((data) => !!data.file, {
    message: "file-validator",
    path: ["file"],
  })
  .refine((data) => (data.file?.size || 0) < 5 * 1000 * 1000, {
    message: "file-size-validator",
    path: ["file"],
  })
  .refine((data) => data.password === data["repeat-password"], {
    message: "repeat-password-validator",
    path: ["repeat-password"],
  })
  .refine(
    async (data) => {
      const username = data.username;
      if (!username || username.length < 6) {
        return true;
      }
      return await debounceUsername(username);
    },
    {
      message: "username-existed-validator",
      path: ["username"],
    },
  )
  .refine(
    async (data) => {
      const email = data.email;
      if (!email || !EmailValidator.validate(email)) {
        return true;
      }
      return await debounceEmail(email);
    },
    {
      message: "email-existed-validator",
      path: ["email"],
    },
  );

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { t } = useTranslation(lng, "validator");
  const { t: tf } = useTranslation(lng, "footer");
  const { t: tl } = useTranslation(lng, "login");
  const dispatch = useAppDispatch();
  const search = useSearchParams();
  const redirectUrl = search.get("r");
  const fileInput = createRef<HTMLInputElement>();
  const cropperRef = createRef<ReactCropperElement>();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<any>();
  const [imageInfo, setImageInfo] = useState<IBlob>();
  const [originImage, setOriginImage] = useState();
  const [open, setOpen] = useState<boolean>(false);
  const { setShowAgreementDialog, AgreementDialog, approved, setApproved } =
    useAgreementDialog();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema, undefined, { mode: "async" }),
    defaultValues: {
      file: null,
      username: "",
      nickname: "",
      email: "",
      password: "",
      "repeat-password": "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("values", values);
    const { file, username, nickname, email, password } = values;
    setLoading(true);
    await authService
      .register({
        file,
        username,
        nickname,
        email,
        password,
      })
      .then((res: any) => {
        setLoading(false);
        console.log("res", res);
        if (res?.code === 0) {
          if (res?.data?.user?.id) {
            Cookies.set(cacheIdKey, res?.data?.user?.id);
          }
          Cookies.set(cacheTokenKey, res?.data?.access_token);
          dispatch(setUser(res?.data?.user));
          window.location.replace(redirectUrl || `${domain}/${lng}/admin`);
        }
      })
      .catch((error: any) => {
        setLoading(false);
        console.error(error);
      });
  }

  // 根据内容判断是否显示的页面内组件
  const ShowContent = useCallback(
    ({
      isShow,
      children,
    }: {
      isShow: boolean;
      children: React.ReactElement;
    }) => (isShow ? children : null),
    [],
  );

  const ValidMessage = useCallback(
    ({
      className,
      children,
    }: {
      className?: string;
      children: React.ReactNode;
    }) => (
      <p className={cn("text-sm font-medium text-destructive", className)}>
        {children}
      </p>
    ),
    [],
  );

  return (
    <>
      <div className="my-16 flex w-screen justify-center">
        <div className="z-10 h-fit w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-900 sm:rounded-2xl sm:shadow-xl">
          <PageHeader title={tl("title")} description={tl("tips")} />
          <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 dark:bg-gray-900 sm:px-10">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit(
                    async (values: z.infer<typeof formSchema>) => {
                      if (!approved) {
                        setShowAgreementDialog(true);
                        return;
                      }
                      await onSubmit(values);
                    },
                  )(e);
                }}
                className="space-y-4"
              >
                <FormField
                  required
                  control={form.control}
                  name="file"
                  render={({
                    field: { value, onChange, ...fieldProps },
                    fieldState: { error },
                  }) => (
                    <FormItem>
                      <FormLabel>{tl("avatar-label")}</FormLabel>
                      <FormControl>
                        <FileInput
                          {...fieldProps}
                          id="avatar"
                          htmlFor="upload"
                          ref={fileInput}
                          accept="image/jpg, image/jpeg, image/png"
                          type="file"
                          multiple={false}
                          onChange={async (event) => {
                            if (
                              event.target.files &&
                              event.target.files.length > 0
                            ) {
                              const file = event.target.files[0];
                              import("@/utils/image")
                                .then(async (module) => {
                                  const content = await module.getBase64(file);
                                  setOriginImage(content);
                                  setOpen(true);
                                  setImageInfo({
                                    name: file.name,
                                    type: file.type,
                                    lastModified: file.lastModified,
                                  });
                                  // onChange(file);
                                })
                                .catch((error) => console.error(error));
                            }
                          }}
                        >
                          <label
                            htmlFor="upload"
                            className="flex flex-col items-center justify-center"
                          >
                            <ShowContent isShow={!image}>
                              <>
                                <span className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-[4px] border-[1px] border-gray-300 bg-gray-100 dark:border-gray-500 dark:bg-gray-800">
                                  <AiOutlineCloudUpload className="h-5 w-5" />
                                </span>
                                <span
                                  className="mt-2 text-sm text-muted-foreground"
                                  onClick={(
                                    e: React.MouseEvent<
                                      HTMLSpanElement,
                                      MouseEvent
                                    >,
                                  ) => {
                                    e.preventDefault();
                                  }}
                                >
                                  {tl("avatar-placeholder")}
                                </span>
                              </>
                            </ShowContent>
                            <ShowContent isShow={!!image}>
                              <>
                                <div
                                  className="flex justify-center"
                                  onClick={(
                                    e: React.MouseEvent<
                                      HTMLDivElement,
                                      MouseEvent
                                    >,
                                  ) => {
                                    e.preventDefault();
                                  }}
                                >
                                  <Zoom classDialog="custom-zoom">
                                    <Image
                                      className="rounded-full"
                                      src={image}
                                      width={120}
                                      height={120}
                                      alt="@avatar"
                                    />
                                  </Zoom>
                                </div>
                                <span
                                  className="mt-2 cursor-pointer text-sm text-muted-foreground"
                                  onClick={(
                                    e: React.MouseEvent<
                                      HTMLSpanElement,
                                      MouseEvent
                                    >,
                                  ) => {
                                    e.preventDefault();
                                    setImage(null);
                                    onChange(null);
                                    form.setValue("file", null);
                                    if (fileInput.current) {
                                      fileInput.current.files = null;
                                      fileInput.current.value = "";
                                    }
                                  }}
                                >
                                  {tl("clear-avatar")}
                                </span>
                              </>
                            </ShowContent>
                          </label>
                        </FileInput>
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <FormField
                  required
                  control={form.control}
                  name="username"
                  render={({ field, fieldState: { error } }) => (
                    <FormItem>
                      <FormLabel>{tl("username-label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={tl("username-placeholder")}
                          {...field}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field, fieldState: { error } }) => (
                    <FormItem>
                      <FormLabel>{tl("nickname-label")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={tl("nickname-placeholder")}
                          {...field}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <FormField
                  required
                  control={form.control}
                  name="email"
                  render={({ field, fieldState: { error } }) => (
                    <FormItem>
                      <FormLabel>{tl("email-label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={tl("email-placeholder")}
                          {...field}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <FormField
                  required
                  control={form.control}
                  name="password"
                  render={({ field, fieldState: { error } }) => (
                    <FormItem>
                      <FormLabel>{tl("password-label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={tl("password-placeholder")}
                          {...field}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <FormField
                  required
                  control={form.control}
                  name="repeat-password"
                  render={({ field, fieldState: { error } }) => (
                    <FormItem>
                      <FormLabel>{tl("repeat-password-label")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={tl("repeat-password-placeholder")}
                          {...field}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                      <ShowContent isShow={!!error?.message}>
                        <ValidMessage className="!mt-1 text-[12px] font-normal">
                          {t(error?.message || "")}
                        </ValidMessage>
                      </ShowContent>
                    </FormItem>
                  )}
                />
                <Button
                  disabled={loading}
                  className={`${
                    loading
                      ? "cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                      : ""
                  } flex w-full items-center justify-center gap-3.5 rounded-[4px] bg-blue-500 py-4 text-black hover:bg-blue-600 dark:text-white`}
                  type="submit"
                >
                  {tl("signup")}
                </Button>
              </form>
            </Form>
            <div className="flex flex-row justify-center text-[12px] text-gray-500 dark:text-gray-400">
              <span>{tl("has-account")},&nbsp;</span>
              <Link
                href={`/${lng}/login${redirectUrl ? `?r=${encodeURIComponent(redirectUrl)}` : ""}`}
                className="text-blue-500"
              >
                {tl("go-to-login")}
              </Link>
            </div>
            <Or lng={lng} />
            <ThirdPartyAccount
              approved={approved}
              setShowAgreementDialog={setShowAgreementDialog}
              lng={lng}
            />
          </div>
          <Legal approved={approved} setApproved={setApproved} lng={lng} />
        </div>
      </div>
      <Drawer open={open} onOpenChange={setOpen} dismissible={false}>
        <DrawerContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          // onPointerDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DrawerHeader>
            <DrawerTitle className="text-center">
              {tf("image-cropping")}
            </DrawerTitle>
            <DrawerDescription className="text-center">
              Set your daily activity goal.
            </DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto flex h-[50vh] w-full flex-col items-center">
            <Cropper
              ref={cropperRef}
              style={{ height: "100%", width: "100%" }}
              zoomTo={0.5}
              initialAspectRatio={1}
              aspectRatio={1}
              // preview=".img-preview"
              src={originImage}
              viewMode={1}
              minCropBoxHeight={10}
              minCropBoxWidth={10}
              background={false}
              responsive={true}
              autoCropArea={1}
              checkOrientation={false} // https://github.com/fengyuanchen/cropperjs/issues/671
              guides={true}
            />
          </div>
          <DrawerFooter>
            <Button
              onClick={() => {
                if (typeof cropperRef.current?.cropper !== "undefined") {
                  const canvas = cropperRef.current?.cropper.getCroppedCanvas();
                  const dataURL = canvas.toDataURL();
                  setImage(dataURL);
                  canvas.toBlob((blob) => {
                    if (blob && imageInfo) {
                      import("@/utils/image")
                        .then(async (module) => {
                          const file = await module.blobToFile(blob, imageInfo);
                          console.log("file", file);
                          form.setValue("file", file);
                          setOpen(false);
                        })
                        .catch((error) => console.error(error));
                    }
                  });
                }
              }}
            >
              {tf("crop-image")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.files = null;
                  fileInput.current.value = "";
                }
                setOpen(false);
              }}
            >
              {tf("cancel")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <AgreementDialog lng={lng} callback={() => onSubmit(form.getValues())} />
    </>
  );
}
