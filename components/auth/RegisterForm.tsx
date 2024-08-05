"use client";

import React, { useState } from "react";
import InputField from "../InputBox";
import { useToast } from "../ui/use-toast";
import { useFormik } from "formik";
import { loginSchema, registerSchema } from "~/lib/validation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "../ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const RegisterForm = () => {
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
      roll: "",
      class: "",
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: values.name,
              email: values.email,
              password: values.password,
              classNumber: values.class,
            }),
          },
        );

        const data = await response.json();

        console.log(data);
        if (data.token) {
          router.push("/");
        }

        if (!response.ok) {
          toast({
            variant: "destructive",
            description: data.error,
          });
          throw new Error(data.error);
        }
      } catch (err) {
        toast({
          variant: "destructive",
          description: "Something went wrong",
        });
      } finally {
        setLoading(false);
      }
    },
  });

  const {
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    values,
  } = formik;

  return (
    <div>
      <div className="flex h-[80vh] w-full items-center rounded-[1rem] p-8">
        <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-y-8">
          <InputField
            id="name"
            label="Name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            touched={touched.name}
            placeholder="Enter your name"
          />

          <div className="select flex w-72 gap-x-4">
            <div>
              <div className="mb-2 flex items-center">
                <label className="text-light-text dark:text-dark-text mb- ml-1 text-xs font-medium text-zinc-400">
                  Class
                </label>
              </div>
              <div>
                <Select
                  onValueChange={(value) => setFieldValue("class", value)}
                  value={values.class}
                >
                  <SelectTrigger className="w-[132px] text-zinc-400">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Class</SelectLabel>
                      <SelectItem value="TE-CMPN">TE-CMPN</SelectItem>
                      <SelectItem value="TE-INFT">TE-INFT</SelectItem>
                      <SelectItem value="TE-ECS">TE-ECS</SelectItem>
                      <SelectItem value="SE-CMPN">SE-CMPN</SelectItem>
                      <SelectItem value="SE-EXTC">SE-EXTC</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <InputField
              id="roll"
              label="Roll no."
              value={values.roll}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.roll}
              touched={touched.roll}
              placeholder="Enter roll no."
            />
          </div>
          <InputField
            id="email"
            label="Email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
            placeholder="Enter your email"
          />

          <InputField
            id="password"
            label="Password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your password"
            showPass={showPass}
            setShowPass={setShowPass}
            error={errors.password}
            touched={touched.password}
          />

          {loading ? (
            <Button className="w-full py-6" disabled>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Please wait
            </Button>
          ) : (
            <Button className="w-full py-6" type="submit">
              Sign in
            </Button>
          )}
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link className="text-orange-500 hover:underline" href="/sign-in">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
