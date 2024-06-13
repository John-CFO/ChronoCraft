//////////////////////////////////////custom drawer component//////////////////////////////////////////

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
import { Auth } from "firebase/auth";

import EditProfileModal from "./EditProfileModal";
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import FAQBottomSheet from "./FAQBottomSheet";
import { CustomUser } from "./types/CustomUser"; // CustomUser type definition import to handle conflict with FirebaseUser

////////////////////////////////////////////////////////////////////////////////////////

// interface to handle custom drawer props
interface CustomDrawerProps extends DrawerContentComponentProps {}

////////////////////////////////////////////////////////////////////////////////////////

const CustomDrawer: React.FC<CustomDrawerProps> = (props) => {
  // declaire state for edit profile modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // declaire state for user
  const [user, setUser] = useState<CustomUser | null>(null);

  // BottomSheetModal settings
  // ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // variables
  const snapPoints = useMemo(() => ["25%", "50%"], []);

  // callbacks
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  // fetching user profile data
  const fetchUserProfile = async () => {
    try {
      const currentUser = FIREBASE_AUTH.currentUser;
      if (currentUser && currentUser.uid) {
        const userRef = doc(FIREBASE_FIRESTORE, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUser({ uid: currentUser.uid, ...userDoc.data() } as CustomUser);
          console.log("User data retrieved:", {
            uid: currentUser.uid,
            ...userDoc.data(),
          });
        } else {
          console.log("User document not found");
        }
      } else {
        console.log("User not logged in");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // function to close edit profile modal and update user profile
  const closeProfileModal = () => {
    console.log("Edit modal closed");
    setProfileModalVisible(false);
    fetchUserProfile();
  };

  return (
    <View style={{ flex: 1 }}>
      {/*edit profile button*/}
      <TouchableOpacity
        onPress={() => {
          setProfileModalVisible(true);
          console.log("EditProfileModal opened");
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
          <Feather name="edit" size={28} color="grey" />
        </View>
      </TouchableOpacity>
      {/* EditProfileModal */}

      <Modal
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
          // if user is not logged in, render null
          <></>
        )}
      </Modal>

      <ImageBackground>
        {/*user profile image */}
        <Image
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
      {/*employee-name and personal-ID */}
      <View style={{ margin: 20 }}>
        {/*render user name or unknown */}
        <Text
          style={{
            color: "white",
            fontFamily: "MPLUSLatin_Regular",
            fontSize: 18,
          }}
        >
          Employee: {user?.displayName || "Unknown"}
        </Text>

        {/*render user personal-ID or unknown */}
        <Text
          style={{
            color: "white",
            fontFamily: "MPLUSLatin_Regular",
            fontSize: 14,
          }}
        >
          Personal-ID: {user?.personalID || "Unknown"}
        </Text>
      </View>
      {/*custom drawer section */}
      <ScrollView
        style={{ flex: 1 }}
        {...props}
        contentContainerStyle={{ backgroundColor: "black" }}
      >
        <DrawerItemList {...props} />
      </ScrollView>

      {/*drawer bottom section witch implemates FAQ and Logout */}
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
        {/*FAQ Modal */}
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          backgroundStyle={{ backgroundColor: "white" }}
        >
          <FAQBottomSheet />
        </BottomSheetModal>
        {/*FAQ button */}
        <TouchableOpacity onPress={handlePresentModalPress}>
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 8,
              gap: 20,
              alignItems: "center",
            }}
          >
            <AntDesign name="profile" size={26} color="white" />
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
          {/*Logout button */}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            FIREBASE_AUTH.signOut();
            console.log("User logged out");
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
            <AntDesign name="logout" size={26} color="white" />
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

/*function userAuthState(FIREBASE_AUTH: Auth): [any] {
  throw new Error("Function not implemented.");
}
// wrap the menue in this, if you need the menuelist is scrollable
/*<DrawerContentScrollView
        {...props}
        contentContainerStyle={{ backgroundColor: "black" }}
      ></DrawerContentScrollView>*/
