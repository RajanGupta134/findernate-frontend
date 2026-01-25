"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  User,
  HelpCircle,
  LogOut,
  Shield,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Volume2,
  Layers,
  Building2,
} from "lucide-react";
import { HelpCenterModal } from "@/components/HelpCenterModal";
import { MessagingPrivacySettings } from "@/components/MessagingPrivacySettings";
import BankDetailsModal from "@/components/business/BankDetailsModal";

const SettingsPage = () => {
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [hideAddress, setHideAddress] = useState(false);
  const [hideNumber, setHideNumber] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Status Bar */}
      {/* <div className="bg-gray-200 px-4 py-2 flex justify-between items-center text-sm text-gray-800">
        <span>10:34</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
        </div>
      </div> */}

      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-center relative border-b border-gray-200">
        <ChevronLeft
          className="w-6 h-6 text-gray-600 absolute left-4 cursor-pointer"
          onClick={() => router.back()}
        />{" "}
        <h1 className="text-2xl font-medium text-black">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="bg-white">
        {/* Main Settings */}
        <div className="px-4 py-2">
          <SettingItem icon={<Shield />} title="Upgrade Business Profile" />
          <SettingItem
            icon={<Globe />}
            title="Language"
            right={
              <div className="flex items-center gap-2 text-gray-600">
                <span>English</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            }
          />
          <SettingToggle
            icon={<Volume2 />}
            title="Mute Notification"
            enabled={muteNotifications}
            onToggle={() => setMuteNotifications(!muteNotifications)}
          />
          <SettingItem
            icon={<Bell />}
            title="Custom Notification"
            // highlighted
          />
          <SettingItem icon={<User />} title="Account" />
          <SettingItem icon={<Layers />} title="About App" />
          <div onClick={() => setIsHelpCenterOpen(true)} className="cursor-pointer">
            <SettingItem icon={<HelpCircle />} title="Help Center" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mx-4"></div>

        {/* Business Info Section */}
        <div className="px-4 py-6">
          <h2 className="text-gray-500 font-medium text-sm mb-4">
            Business Info
          </h2>
          <div className="space-y-0">
            <SettingItem icon={<Shield />} title="View Your Business Details" />
            <SettingItem icon={<Shield />} title="Complete your KYC" />
            <SettingItem icon={<Shield />} title="Promote Your Business" />
            <SettingItem icon={<Shield />} title="Edit Your Business Details" />
            <div onClick={() => setIsBankDetailsOpen(true)} className="cursor-pointer">
              <SettingItem icon={<Building2 />} title="Bank Account Details" />
            </div>
            <SettingToggle
              icon={<MapPin />}
              title="Hide Address"
              enabled={hideAddress}
              onToggle={() => setHideAddress(!hideAddress)}
            />
            <SettingToggle
              icon={<Phone />}
              title="Hide Number"
              enabled={hideNumber}
              onToggle={() => setHideNumber(!hideNumber)}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mx-4"></div>

        {/* Messaging Privacy Settings */}
        <MessagingPrivacySettings />

        {/* Divider */}
        <div className="h-px bg-gray-200 mx-4"></div>

        {/* Logout */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-medium">Logout</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Bottom Navigation Indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-black h-1 flex justify-center items-center">
        <div className="w-32 h-1 bg-white rounded-full"></div>
      </div>

      {/* Help Center Modal */}
      <HelpCenterModal
        isOpen={isHelpCenterOpen}
        onClose={() => setIsHelpCenterOpen(false)}
      />

      {/* Bank Details Modal */}
      <BankDetailsModal
        isOpen={isBankDetailsOpen}
        onClose={() => setIsBankDetailsOpen(false)}
        onSuccess={() => {
          // Optional: Add any additional actions after successful bank details save
          console.log('Bank details saved successfully');
        }}
      />
    </div>
  );
};

// ✅ Updated: SettingItem with optional `right` prop
type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  highlighted?: boolean;
};

const SettingItem = ({
  icon,
  title,
  right,
  highlighted = false,
}: SettingItemProps) => (
  <div
    className={`flex items-center justify-between py-4 ${
      highlighted ? "bg-gray-100" : ""
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="text-gray-600">{icon}</span>
      <span className="text-gray-900 font-medium">{title}</span>
    </div>
    {right ?? <ChevronRight className="w-5 h-5 text-gray-400" />}
  </div>
);

// ✅ Type for toggle component
type SettingToggleProps = {
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onToggle: () => void;
};

const SettingToggle = ({
  icon,
  title,
  enabled,
  onToggle,
}: SettingToggleProps) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center gap-3">
      <span className="text-gray-600">{icon}</span>
      <span className="text-gray-900 font-medium">{title}</span>
    </div>
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={enabled}
        onChange={onToggle}
      />
      <div
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          enabled ? "bg-gray-400" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
            enabled ? "translate-x-6" : "translate-x-0.5"
          }`}
        ></div>
      </div>
    </label>
  </div>
);

export default SettingsPage;
