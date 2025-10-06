//////////////////////////////////////custom drawer component//////////////////////////////////////////

// this coponent is used to create the custom  user-specific drawer
// it includes the Edit Profile modal, the FAQ bottom sheet, the drawer item list as component and the logout function

///////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  View,
  Text,
  ImageBackground,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, {
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  DrawerContentComponentProps,
  DrawerItemList,
} from "@react-navigation/drawer";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { getDoc, doc } from "firebase/firestore";

import EditProfileModal from "./EditProfileModal";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import FAQBottomSheet from "./FAQBottomSheet";
import { MergedUser } from "./types/CustomUser";
import RestartTourButton from "./../components/services/copilotTour/RestartTourButton";
import AccessibilityToggleButton from "./services/accessibility/AccessibilityToggleButton";
import { useAccessibilityStore } from "../components/services/accessibility/accessibilityStore";
import TFAButton from "./services/TFAButton";
import TwoFactorModal from "./TwoFactorModal";
import { FirestoreUserSchema } from "../validation/firestoreSchemas";

////////////////////////////////////////////////////////////////////////////////////////

// interface to handle custom drawer props
interface CustomDrawerProps extends DrawerContentComponentProps {}

////////////////////////////////////////////////////////////////////////////////////////

const CustomDrawer: React.FC<CustomDrawerProps> = (props) => {
  // initialize the accessibility store
  const accessMode = useAccessibilityStore(
    (state) => state.accessibilityEnabled
  );

  // declare state for edit profile modal visibility
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // declare state for user data
  const [user, setUser] = useState<MergedUser | null>(null);

  // declare state for 2FA modal
  const [tfaModalVisible, setTfaModalVisible] = useState(false);

  // state for the 2FA Button
  const [isEnrolled, setIsEnrolled] = useState(false);

  // function to close 2FA modal
  const closeTfaModal = () => {
    setTfaModalVisible(false);
  };

  // BottomSheetModal settings
  // reference to the bottom sheet modal
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // snap points for the bottom sheet modal
  const snapPoints = useMemo(() => ["25%", "50%"], []);
  // callback to handle the presentation of the bottom sheet modal
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);
  // callback to handle changes in the bottom sheet modal
  const handleSheetChanges = useCallback((index: number) => {
    // console.log("handleSheetChanges", index);
  }, []);

  // function to fetch user profile data from Firestore
  const fetchUserProfile = async () => {
    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (currentUser && currentUser.uid) {
        const userRef = doc(FIREBASE_FIRESTORE, "Users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          // validate and parse user data
          const parsedData = FirestoreUserSchema.parse({
            uid: currentUser.uid,
            ...userDoc.data(),
          });

          const mergedUser: MergedUser = {
            ...currentUser,
            ...parsedData,
          };

          setUser(mergedUser);
          setIsEnrolled(!!mergedUser.totpEnabled);
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // hook to fetch user profile data when component mounts
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // function to close edit profile modal and update user profile
  const closeProfileModal = () => {
    //console.log("Edit modal closed");
    setProfileModalVisible(false);
    fetchUserProfile();
  };

  return (
    <View style={{ flex: 1 }}>
      {/*edit profile button*/}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Edit Profile"
        onPress={() => {
          setProfileModalVisible(true);
          // console.log("EditProfileModal opened");
        }}
      >
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 20,
            gap: 20,
            alignItems: "flex-end",
          }}
        >
          <Feather
            name="edit"
            size={28}
            color="grey"
            accessibilityElementsHidden
          />
        </View>
      </TouchableOpacity>
      {/* EditProfileModal */}

      <Modal
        accessibilityViewIsModal
        accessibilityLabel="Edit Profile Modal"
        isVisible={profileModalVisible}
        backdropColor="black"
        onBackdropPress={closeProfileModal}
        swipeDirection={["up", "down"]}
        onSwipeComplete={closeProfileModal}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {user ? ( // conditional rendering to check if user is logged in
          // if user is logged in, render EditProfileModal
          <EditProfileModal
            onClose={closeProfileModal}
            userId={""}
            visible={false}
            navigation={undefined}
            user={user}
          />
        ) : (
          // if user is not logged in, render null (empty fragment)
          <></>
        )}
      </Modal>

      {/* TwoFactorModal */}
      <Modal
        accessibilityViewIsModal
        accessibilityLabel="Two Factor Authentication Modal"
        isVisible={tfaModalVisible}
        backdropColor="black"
        onBackdropPress={closeTfaModal}
        swipeDirection={["up", "down"]}
        onSwipeComplete={closeTfaModal}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        {user ? (
          <TwoFactorModal
            onClose={closeTfaModal}
            isEnrolled={isEnrolled}
            setIsEnrolled={setIsEnrolled}
          />
        ) : (
          <></>
        )}
      </Modal>

      <ImageBackground>
        {/* user profile image */}
        <Image
          accessibilityRole="image"
          accessibilityLabel={
            user?.displayName
              ? `Profile picture of ${user.displayName}`
              : "Default profile picture"
          }
          source={
            user?.photoURL // render user image or default image
              ? { uri: user.photoURL }
              : require("../assets/profile_avatar.png")
          }
          style={{
            height: 85,
            width: 85,
            borderRadius: 40,
            marginLeft: 20,
            marginTop: 5,
            borderWidth: 2,
            borderColor: "aqua",
          }}
        />
      </ImageBackground>
      {/* employee-name and personal-ID */}
      <View style={{ margin: 20 }}>
        {/* render user name or unknown */}
        <Text
          accessibilityLabel={`Employee ${user?.displayName || "Unknown"}`}
          style={{
            color: "#a9a9a9",
            fontFamily: accessMode ? "MPLUSLatin_Bold" : "MPLUSLatin_Regular",
            fontSize: accessMode ? 22 : 18,
          }}
        >
          Employee:{" "}
          <Text style={{ color: "white" }}>
            {user?.displayName || "Unknown"}
          </Text>
        </Text>

        {/* render user personal-ID or unknown */}
        <Text
          style={{
            color: "#a9a9a9",
            fontFamily: accessMode ? "MPLUSLatin_Bold" : "MPLUSLatin_Regular",
            fontSize: accessMode ? 18 : 14,
          }}
        >
          Personal-ID:{" "}
          <Text style={{ color: "white" }}>
            {user?.personalID || "Unknown"}
          </Text>
        </Text>
      </View>
      {/* custom drawer section */}
      <ScrollView
        style={{ flex: 1 }}
        {...props}
        contentContainerStyle={{
          backgroundColor: "black",
          paddingBottom: 320,
        }}
      >
        <DrawerItemList {...props} />
      </ScrollView>

      {/* drawer bottom section witch implemates FAQ and Logout */}
      <View
        style={{
          position: "absolute",
          backgroundColor: "black",
          left: 0,
          bottom: 0,
          right: 0,
          flex: 1,
          height: 150,
          padding: 20,
          borderTopColor: "grey",
          borderWidth: 0.5,
        }}
      >
        {/* restart tour, accessibility and TFA button */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 150,
          }}
        >
          <RestartTourButton userId={user?.uid || ""} />
          <AccessibilityToggleButton />
          <TFAButton
            onPress={() => setTfaModalVisible(true)}
            isEnrolled={isEnrolled}
          />
        </View>

        {/* FAQ Modal */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={true}
          android_keyboardInputMode="adjustResize"
          backgroundStyle={{ backgroundColor: "#191919" }}
          handleIndicatorStyle={{ backgroundColor: "#191919" }}
        >
          <FAQBottomSheet
            navigation={undefined}
            closeModal={() => bottomSheetModalRef.current?.close()}
          />
        </BottomSheetModal>
        {/* FAQ button */}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Frequently Asked Questions"
          onPress={handlePresentModalPress}
        >
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 8,
              gap: 20,
              alignItems: "center",
            }}
          >
            <AntDesign
              name="profile"
              size={26}
              color="white"
              accessibilityElementsHidden
            />

            <Text
              style={{
                color: "white",
                fontFamily: "MPLUSLatin_Regular",
                fontSize: 24,
              }}
            >
              FAQ
            </Text>
          </View>
          {/* Logout button */}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Logout"
          onPress={() => {
            FIREBASE_AUTH.signOut();
            // console.log("User logged out");
          }}
        >
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 8,
              gap: 20,
              alignItems: "center",
            }}
          >
            <AntDesign
              name="logout"
              size={26}
              color="white"
              accessibilityElementsHidden
            />
            <Text
              style={{
                color: "white",
                fontFamily: "MPLUSLatin_Regular",
                fontSize: 24,
              }}
            >
              Logout
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawer;
