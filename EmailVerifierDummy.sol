// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract EmailVerifier {
    uint256 amount = 10000000000000000; // .01 ether

    function verify(bytes memory proof) public returns (bool) {
        uint i = 1;
        bytes memory iBytes = abi.encodePacked(i);
        if (keccak256(proof) == keccak256(iBytes)) {
            msg.sender.call{value: amount}("");
            return true;
        }
        return false;
    }
}